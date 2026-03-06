#!/usr/bin/env bash
# Build a 32-bit Alpine Linux initramfs image with Python3 + pandas for v86.
#
# Strategy: pack the entire rootfs as a cpio.gz initramfs so the kernel boots
# entirely from RAM — no disk driver or switch_root complexity needed.
#
# Output:
#   public/v86/vmlinuz-python    — Alpine Linux 6.6 x86 kernel
#   public/v86/initramfs-python  — cpio.gz rootfs (Alpine + Python3 + pandas)
#
# Boot config in v86:
#   bzimage: { url: "/v86/vmlinuz-python" }
#   initrd:  { url: "/v86/initramfs-python" }
#   cmdline: "console=ttyS0 noapic nolapic quiet"
#
# Requires: docker (linux/386 images), cpio, gzip
# No root required.
#
# Run: bash scripts/build-python-image.sh

set -euo pipefail

OUT="public/v86"
TMPDIR_ROOT="$(mktemp -d)"
ROOTFS="$TMPDIR_ROOT/rootfs"
TARBALL="$TMPDIR_ROOT/rootfs.tar"
INITRAMFS="$OUT/initramfs-python"

cleanup() {
    rm -rf "$TMPDIR_ROOT"
    docker rm -f v86-py-build 2>/dev/null || true
    docker rmi v86-py-image 2>/dev/null || true
}
trap cleanup EXIT

mkdir -p "$OUT" "$ROOTFS"

echo "=== [1/4] Build rootfs in 32-bit Alpine Docker container ==="

# Use a Dockerfile so we can replace /sbin/init at build time.
# Overwriting it at runtime fails — busybox is executing as PID 1.
cat > "$TMPDIR_ROOT/Dockerfile" << 'DOCKERFILE'
FROM i386/alpine:3.19

RUN apk add --no-cache python3 py3-pandas py3-numpy && \
    rm -rf /var/cache/apk/* /tmp/*

# Custom init: mount pseudo-filesystems, print banner, drop to shell.
# Write to a temp name first (busybox is executing as /sbin/init), then swap.
RUN printf '#!/bin/sh\n\
mount -t proc proc /proc 2>/dev/null\n\
mount -t sysfs sysfs /sys 2>/dev/null\n\
mount -t devtmpfs devtmpfs /dev 2>/dev/null || mdev -s\n\
echo 0 > /proc/sys/kernel/printk 2>/dev/null || true\n\
export HOME=/root\n\
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n\
export PS1="yousandbox:\\w# "\n\
export TERM=xterm\n\
cd /root\n\
echo ""\n\
echo "yousandbox.com -- Python & Data"\n\
python3 --version 2>&1\n\
echo ""\n\
exec /bin/sh\n\
' > /sbin/v86init \
 && chmod +x /sbin/v86init \
 && rm /sbin/init \
 && mv /sbin/v86init /sbin/init
DOCKERFILE

docker build \
    --platform linux/386 \
    --no-cache \
    -t v86-py-image \
    -f "$TMPDIR_ROOT/Dockerfile" \
    . 1>&2

docker create --platform linux/386 --name v86-py-build v86-py-image 1>&2

echo "=== [2/4] Export Docker rootfs ==="
docker export v86-py-build -o "$TARBALL"
docker rm -f v86-py-build 1>&2
docker rmi v86-py-image 1>&2

echo "=== [3/4] Build cpio.gz initramfs (rootfs in RAM — no disk needed) ==="
# Extract tarball, then replace /dev entirely with deterministic device nodes.
# Docker export may contain a plain-file /dev/console; if left in place, init
# stdio gets bound to a non-device and serial output disappears after /init.
tar -xf "$TARBALL" -C "$ROOTFS" 2>/dev/null
rm -rf "$ROOTFS/dev"
mkdir -p "$ROOTFS/dev"

# Create essential /dev nodes that the kernel opens for init's stdin/stdout/stderr.
# Without /dev/console the kernel silently redirects init's stdio to /dev/null.
# Requires --privileged for mknod inside the container.
docker run --rm --privileged \
    -v "$ROOTFS/dev:/dev_out" \
    alpine:3.19 sh -euc '
        mknod -m 600 /dev_out/console  c 5 1
        mknod -m 666 /dev_out/ttyS0    c 4 64
        mknod -m 666 /dev_out/null     c 1 3
        mknod -m 666 /dev_out/zero     c 1 5
        mknod -m 666 /dev_out/urandom  c 1 9
    ' 1>&2

echo "  Rootfs size: $(du -sh "$ROOTFS" | cut -f1)"

# The kernel initramfs boot requires /init at the root, not /sbin/init.
# Copy our custom init there; keep /sbin/init intact for the shell.
cp "$ROOTFS/sbin/init" "$ROOTFS/init"

echo "  Packing as cpio.gz…"

# Pack as newc cpio then gzip — the kernel expects this for initramfs
( cd "$ROOTFS" && find . -print0 | sort -z | cpio --null -o --format=newc ) \
    | gzip -9 > "$INITRAMFS"

echo "  Initramfs: $(du -sh "$INITRAMFS" | cut -f1)"

echo "=== [4/4] Extract 32-bit Alpine kernel ==="
docker run \
    --platform linux/386 \
    --rm \
    -v "$(pwd)/$OUT:/out" \
    i386/alpine:3.19 \
    sh -euc '
        apk add --no-cache linux-lts 1>&2
        cp /boot/vmlinuz-lts /out/vmlinuz-python
        ls -lh /boot/vmlinuz-lts
    ' 2>/dev/null

echo ""
echo "=== Done ==="
ls -lh "$OUT/vmlinuz-python" "$OUT/initramfs-python"
echo ""
echo "v86 boot config:"
echo "  bzimage: { url: \"/v86/vmlinuz-python\" }"
echo "  initrd:  { url: \"/v86/initramfs-python\" }"
echo "  cmdline: \"console=ttyS0 noapic nolapic quiet\""
echo ""
echo "Memory: needs at least 512 MB (kernel + 185 MB decompressed rootfs)"

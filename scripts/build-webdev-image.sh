#!/usr/bin/env bash
# Build a 32-bit Alpine Linux initramfs image with Node.js + npm for v86.
#
# Reuses the same vmlinuz-python kernel (Alpine LTS, not flavor-specific).
#
# Output:
#   public/v86/initramfs-webdev  — cpio.gz rootfs (Alpine + Node.js + npm)
#
# Boot config in v86:
#   bzimage: { url: "/v86/vmlinuz-python" }   (reused — same kernel)
#   initrd:  { url: "/v86/initramfs-webdev" }
#   cmdline: "console=ttyS0 noapic nolapic quiet"
#
# Requires: docker (linux/386 images), cpio, gzip
# Run: bash scripts/build-webdev-image.sh

set -euo pipefail

OUT="public/v86"
TMPDIR_ROOT="$(mktemp -d)"
ROOTFS="$TMPDIR_ROOT/rootfs"
TARBALL="$TMPDIR_ROOT/rootfs.tar"
INITRAMFS="$OUT/initramfs-webdev"

cleanup() {
    rm -rf "$TMPDIR_ROOT"
    docker rm -f v86-wd-build 2>/dev/null || true
    docker rmi v86-wd-image 2>/dev/null || true
}
trap cleanup EXIT

mkdir -p "$OUT" "$ROOTFS"

echo "=== [1/3] Build rootfs in 32-bit Alpine Docker container ==="

cat > "$TMPDIR_ROOT/Dockerfile" << 'DOCKERFILE'
FROM i386/alpine:3.19

RUN apk add --no-cache nodejs npm && \
    rm -rf /var/cache/apk/* /tmp/*

# HTTP bridge: Node.js ttyS1 bridge (python3 is not available in the webdev image).
RUN printf 'const net = require("net");\n\
const fs = require("fs");\n\
\n\
function forward(port, req) {\n\
    return new Promise((resolve) => {\n\
        const sock = new net.Socket();\n\
        let resp = Buffer.alloc(0);\n\
        sock.setTimeout(5000);\n\
        sock.connect(port, "127.0.0.1", () => sock.write(req));\n\
        sock.on("data", (d) => { resp = Buffer.concat([resp, d]); });\n\
        sock.on("end", () => resolve(resp));\n\
        sock.on("timeout", () => { sock.destroy(); resolve(Buffer.from("HTTP/1.0 504 Timeout\\r\\n\\r\\n")); });\n\
        sock.on("error", (e) => resolve(Buffer.from("HTTP/1.0 502 Bad Gateway\\r\\n\\r\\n" + e.message)));\n\
    });\n\
}\n\
\n\
const tty = fs.openSync("/dev/ttyS1", "r+");\n\
const ttyRead = fs.createReadStream(null, { fd: tty, autoClose: false });\n\
const ttyWrite = (buf) => fs.writeSync(tty, buf);\n\
\n\
let buf = Buffer.alloc(0);\n\
ttyRead.on("data", async (chunk) => {\n\
    buf = Buffer.concat([buf, chunk]);\n\
    while (true) {\n\
        const s = buf.indexOf(0x02);\n\
        if (s === -1) break;\n\
        const e = buf.indexOf(0x03, s + 1);\n\
        if (e === -1) break;\n\
        const frame = buf.slice(s + 1, e);\n\
        buf = buf.slice(e + 1);\n\
        const colon = frame.indexOf(58); // ":"\n\
        if (colon === -1) continue;\n\
        const port = parseInt(frame.slice(0, colon).toString());\n\
        const req = frame.slice(colon + 1);\n\
        const resp = await forward(port, req);\n\
        const out = Buffer.concat([Buffer.from([0x02]), resp, Buffer.from([0x03])]);\n\
        ttyWrite(out);\n\
    }\n\
});\n\
' > /usr/local/bin/http-bridge.js && chmod +x /usr/local/bin/http-bridge.js

# Custom init: banner shows Node version, starts http-bridge, drops to shell.
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
echo "yousandbox.com -- Web Dev"\n\
node --version 2>&1\n\
echo ""\n\
node /usr/local/bin/http-bridge.js &\n\
exec /bin/sh\n\
' > /sbin/v86init \
 && chmod +x /sbin/v86init \
 && rm /sbin/init \
 && mv /sbin/v86init /sbin/init
DOCKERFILE

docker build \
    --platform linux/386 \
    --no-cache \
    -t v86-wd-image \
    -f "$TMPDIR_ROOT/Dockerfile" \
    . 1>&2

docker create --platform linux/386 --name v86-wd-build v86-wd-image 1>&2

echo "=== [2/3] Export Docker rootfs ==="
docker export v86-wd-build -o "$TARBALL"
docker rm -f v86-wd-build 1>&2
docker rmi v86-wd-image 1>&2

echo "=== [3/3] Build cpio.gz initramfs ==="
tar -xf "$TARBALL" -C "$ROOTFS" 2>/dev/null
rm -rf "$ROOTFS/dev"
mkdir -p "$ROOTFS/dev"

docker run --rm --privileged \
    -v "$ROOTFS/dev:/dev_out" \
    alpine:3.19 sh -euc '
        mknod -m 600 /dev_out/console  c 5 1
        mknod -m 666 /dev_out/ttyS0    c 4 64
        mknod -m 666 /dev_out/ttyS1    c 4 65
        mknod -m 666 /dev_out/null     c 1 3
        mknod -m 666 /dev_out/zero     c 1 5
        mknod -m 666 /dev_out/urandom  c 1 9
    ' 1>&2

echo "  Rootfs size: $(du -sh "$ROOTFS" | cut -f1)"

cp "$ROOTFS/sbin/init" "$ROOTFS/init"

echo "  Packing as cpio.gz…"
( cd "$ROOTFS" && find . -print0 | sort -z | cpio --null -o --format=newc ) \
    | gzip -9 > "$INITRAMFS"

echo "  Initramfs: $(du -sh "$INITRAMFS" | cut -f1)"
echo ""
echo "=== Done ==="
ls -lh "$OUT/initramfs-webdev"
echo ""
echo "v86 boot config:"
echo "  bzimage: { url: \"/v86/vmlinuz-python\" }   (reused kernel)"
echo "  initrd:  { url: \"/v86/initramfs-webdev\" }"
echo "  cmdline: \"console=ttyS0 noapic nolapic quiet\""

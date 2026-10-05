#!/bin/bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (c) 2026 Lxcyfxr
#
# Build a .deb package for webbased-scanner-gui.
# Run from the project root: ./build-deb.sh
#
# Requirements: dpkg-deb, node, npm, python3

set -e

VERSION="1.0.0"
PKGNAME="webbased-scanner-gui"
OUTDIR="dist"
PKGDIR="$OUTDIR/${PKGNAME}_${VERSION}"

# ── 1. Build frontend ──────────────────────────────────────────────────────────
echo "→ Building frontend..."
cd frontend
npm ci --silent
npm run build
cd ..

# ── 2. Assemble package tree ───────────────────────────────────────────────────
echo "→ Assembling package tree..."
rm -rf "$PKGDIR"

install -d "$PKGDIR/DEBIAN"
install -d "$PKGDIR/usr/share/$PKGNAME/frontend"
install -d "$PKGDIR/usr/share/doc/$PKGNAME"
install -d "$PKGDIR/etc/$PKGNAME"
install -d "$PKGDIR/lib/systemd/system"
install -d "$PKGDIR/var/lib/$PKGNAME"

# Application files
cp -r backend/               "$PKGDIR/usr/share/$PKGNAME/backend"
cp -r frontend/dist/         "$PKGDIR/usr/share/$PKGNAME/frontend/dist"
cp    requirements.txt       "$PKGDIR/usr/share/$PKGNAME/"

# Packaging control files
cp packaging/deb/DEBIAN/control   "$PKGDIR/DEBIAN/control"
cp packaging/deb/DEBIAN/postinst  "$PKGDIR/DEBIAN/postinst"
cp packaging/deb/DEBIAN/prerm     "$PKGDIR/DEBIAN/prerm"
cp packaging/deb/DEBIAN/postrm    "$PKGDIR/DEBIAN/postrm"
chmod 755 "$PKGDIR/DEBIAN/postinst" "$PKGDIR/DEBIAN/prerm" "$PKGDIR/DEBIAN/postrm"

# Systemd service
cp packaging/deb/webbased-scanner-gui.service \
   "$PKGDIR/lib/systemd/system/webbased-scanner-gui.service"

# Config file
cp packaging/deb/config.env "$PKGDIR/etc/$PKGNAME/config.env"

# License and copyright
cp LICENSE                    "$PKGDIR/usr/share/doc/$PKGNAME/copyright"
cp packaging/deb/copyright    "$PKGDIR/usr/share/doc/$PKGNAME/copyright.debian"

# Update version in control file
sed -i "s/^Version:.*/Version: $VERSION/" "$PKGDIR/DEBIAN/control"

# ── 3. Build .deb ─────────────────────────────────────────────────────────────
echo "→ Building .deb..."
mkdir -p "$OUTDIR"
dpkg-deb --build --root-owner-group "$PKGDIR" "$OUTDIR/${PKGNAME}_${VERSION}_all.deb"

echo ""
echo "✓ Built: $OUTDIR/${PKGNAME}_${VERSION}_all.deb"
echo ""
echo "Install with:"
echo "  sudo dpkg -i $OUTDIR/${PKGNAME}_${VERSION}_all.deb"
echo "  sudo apt-get install -f   # install missing dependencies if needed"

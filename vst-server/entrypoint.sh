#!/bin/bash
set -e

Xvfb :99 -screen 0 1024x768x24 &
sleep 1

jackd --no-realtime -d dummy -r 48000 -p 512 &
sleep 2

if jack_lsp > /dev/null 2>&1; then
    echo "JACK ready — starting Carla"
    carla --no-gui &
    sleep 3
else
    echo "JACK unavailable — synth fallback will be used"
fi

exec node server.js

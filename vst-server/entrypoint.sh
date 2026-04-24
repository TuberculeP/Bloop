#!/bin/bash
set -e

Xvfb :99 -screen 0 1024x768x24 &
sleep 1

jackd --no-realtime -d dummy -r 48000 -p 512 &
sleep 2

if ! jack_lsp > /dev/null 2>&1; then
    echo "JACK unavailable — synth fallback will be used"
    exec node server.js
fi

echo "JACK ready"

SURGE_PATH="/usr/lib/vst3/Surge XT.vst3"

# VST3 is a directory bundle on Linux — use -d not -f
if [ -d "$SURGE_PATH" ]; then
    DISCOVERY=$(carla-discovery-native vst3 "$SURGE_PATH" 2>/dev/null || echo "")
    SURGE_LABEL=$(echo "$DISCOVERY" | grep "::label::" | head -1 | awk -F'::' '{print $3}')
    SURGE_UID=$(echo "$DISCOVERY" | grep "::uniqueId::" | head -1 | awk -F'::' '{print $3}')

    if [ -n "$SURGE_UID" ]; then
        cat > /tmp/project.carxp << EOF
<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE CARLA-PROJECT>
<CARLA-PROJECT VERSION='2.0'>
  <Plugin>
    <Info>
      <Type>VST3</Type>
      <Name>Surge XT</Name>
      <Filename>$SURGE_PATH</Filename>
      <Label>$SURGE_LABEL</Label>
      <UniqueID>$SURGE_UID</UniqueID>
      <Category>Synth</Category>
    </Info>
    <Data>
      <Active>Yes</Active>
      <Volume>1.000000</Volume>
      <DryWet>1.000000</DryWet>
    </Data>
  </Plugin>
</CARLA-PROJECT>
EOF
        echo "Starting Carla with Surge XT (uid=$SURGE_UID)"
        carla --no-gui /tmp/project.carxp &
        sleep 5
        export CARLA_STARTED=1
    else
        echo "Could not discover Surge XT — synth fallback will be used"
    fi
else
    echo "Surge XT not found at $SURGE_PATH — synth fallback will be used"
fi

exec node server.js

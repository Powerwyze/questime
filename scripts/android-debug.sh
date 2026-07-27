#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"

if command -v /usr/libexec/java_home >/dev/null 2>&1; then
  JAVA_HOME_CANDIDATE="$(/usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home -v 17 2>/dev/null || true)"
else
  JAVA_HOME_CANDIDATE=""
fi

if [[ -z "${JAVA_HOME:-}" && -n "$JAVA_HOME_CANDIDATE" ]]; then
  export JAVA_HOME="$JAVA_HOME_CANDIDATE"
elif [[ -z "${JAVA_HOME:-}" && -d /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ]]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
elif [[ -z "${JAVA_HOME:-}" && -d /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ]]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
fi

if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi

if [[ ! -f "$ANDROID_DIR/local.properties" && -d "$HOME/Library/Android/sdk" ]]; then
  printf 'sdk.dir=%s\n' "$HOME/Library/Android/sdk" > "$ANDROID_DIR/local.properties"
fi

case "${1:-build}" in
  devices)
    adb devices -l
    ;;
  build)
    cd "$ROOT_DIR"
    npm run cap:sync
    cd "$ANDROID_DIR"
    ./gradlew :app:assembleDebug
    ;;
  install)
    "$0" build
    adb install -r "$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
    ;;
  *)
    echo "Usage: $0 {devices|build|install}" >&2
    exit 2
    ;;
esac

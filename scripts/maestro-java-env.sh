#!/usr/bin/env bash

# Configure JAVA_HOME/PATH for Maestro if system Java wrappers are present
# but no runtime is registered. Supports common Homebrew locations.
configure_java_runtime_for_maestro() {
  if command -v java >/dev/null 2>&1 && java -version >/dev/null 2>&1; then
    return 0
  fi

  local java_opt_paths=(
    "/opt/homebrew/opt/openjdk@21"
    "/opt/homebrew/opt/openjdk"
    "/usr/local/opt/openjdk@21"
    "/usr/local/opt/openjdk"
  )

  local opt_path
  for opt_path in "${java_opt_paths[@]}"; do
    if [[ ! -x "${opt_path}/bin/java" ]]; then
      continue
    fi

    local detected_java_home="${opt_path}/libexec/openjdk.jdk/Contents/Home"
    if [[ -d "$detected_java_home" ]]; then
      export JAVA_HOME="$detected_java_home"
    else
      export JAVA_HOME="$opt_path"
    fi

    export PATH="${opt_path}/bin:${PATH}"
    if java -version >/dev/null 2>&1; then
      return 0
    fi
  done

  return 1
}

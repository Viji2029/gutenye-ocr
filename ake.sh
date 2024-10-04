#!/usr/bin/env bash

main() {
  # No-op main function
  true
}

# Skip models, which is large
main_publish() {
  local version="$1"
  local packages="${2:-common,node,browser,react-native}"
  
  update_version "$version"
  
  IFS=',' read -ra pkgs <<< "$packages"
  for pkg in "${pkgs[@]}"; do
    publish "$pkg" "$version"
  done
}

# Run node example
main_node_example() {
  cd packages/node/example || exit
  ./ake start "$@"
}

# Run browser example
main_browser_example() {
  cd packages/browser/example || exit
  ./ake start
}

# Run React Native example
main_react_native_example() {
  cd packages/react-native/example || exit
  ./ake start
}

# Run cpp example
main_cpp_example() {
  local path="$1"
  cd packages/react-native/cpp/example || exit
  if [ -z "$path" ]; then
    ./ake start
  else
    ./ake start "$path"
  fi
}

publish() {
  local package="$1"
  local version="$2"
  cd "packages/$package" || exit
  update_version "$version"
  ./ake publish
}

update_version() {
  local version="$1"
  sed -i "s/\"version\": \".*\"/\"version\": \"$version\"/" package.json
}

# Call main if needed
main

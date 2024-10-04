#!/bin/bash

# Build function
main_build() {
  # Remove the existing build directory
  rm -rf build

  # Run TypeScript compiler
  yarn run tsc --project tsconfig.build.json

  # Run tsc-alias
  yarn run tsc-alias --project tsconfig.build.json
}

# Publish function
main_publish() {
  # Build by scripts.prepublishOnly
  npm publish
}

# Execute functions based on the provided argument
case "$1" in
  build)
    main_build
    ;;
  publish)
    main_publish
    ;;
  *)
    echo "Usage: $0 {build|publish}"
    exit 1
    ;;
esac

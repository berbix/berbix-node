#!/bin/bash

set -ex

VERSION=$(cat version)

sed -i "" -e "s/var SDK_VERSION = '[[:digit:]]*\.[[:digit:]]*\.[[:digit:]]*';/var SDK_VERSION = '$VERSION';/g" lib/berbix.js
sed -i "" -e "s/  \"version\": \"[[:digit:]]*\.[[:digit:]]*\.[[:digit:]]*\",/  \"version\": \"$VERSION\",/g" package.json

git add package.json lib/berbix.js version
git commit -m "Updating Berbix Node SDK version to $VERSION"
git tag -a $VERSION -m "Version $VERSION"
git push --follow-tags

#npm run build
npm publish

#!/bin/bash

set -ex

VERSION=$(cat version)

sed -i "" -e "s/var SDK_VERSION = '[[:digit:]]*\.[[:digit:]]*\.[[:digit:]]*';/var SDK_VERSION = '$VERSION';/g" lib/berbix.js
sed -i "" -e "s/  \"version\": \"[[:digit:]]*\.[[:digit:]]*\.[[:digit:]]*\",/  \"version\": \"$VERSION\",/g" package.json
exit

git add berbix.gemspec lib/berbix.rb version
git commit -m "Updating Berbix Ruby SDK version to $VERSION"
git tag -a $VERSION -m "Version $VERSION"
git push --follow-tags

gem build berbix.gemspec
gem push berbix-$VERSION.gem

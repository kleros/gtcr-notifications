# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.3](https://github.com/kleros/gtcr-notifications/compare/v0.1.2...v0.1.3) (2020-01-03)


### Bug Fixes

* decrease polling interval to avoid rate limiting ([428140a](https://github.com/kleros/gtcr-notifications/commit/428140ae715885833eeea6ecefa980d812ca82cd))

### [0.1.2](https://github.com/kleros/gtcr-notifications/compare/v0.1.1...v0.1.2) (2019-12-18)


### Bug Fixes

* add missing provider ([c49c970](https://github.com/kleros/gtcr-notifications/commit/c49c970e84c17579d67cf0b935e23153f353740b))

### 0.1.1 (2019-12-18)


### Features

* add evidence event listener ([cb2fadd](https://github.com/kleros/gtcr-notifications/commit/cb2fadd2ca0450b925982025a5287e0a05bfc144))
* add notifications path ([c4351c0](https://github.com/kleros/gtcr-notifications/commit/c4351c081035676d5660613d81b469d7f551a2a7))
* add other endpoints scaffolding ([d52b0a7](https://github.com/kleros/gtcr-notifications/commit/d52b0a7a9fd15ddb2cf6cd3d503e340fa9806563))
* add subscribe endpoint ([eabd0c8](https://github.com/kleros/gtcr-notifications/commit/eabd0c84263a195ae514a33fcc555281f3135a06))
* allow marking notification as clicked ([9633538](https://github.com/kleros/gtcr-notifications/commit/963353852a9e1cd03ce8618cbdbcc0c3647df26c))
* allow marking notifications as read ([29eed98](https://github.com/kleros/gtcr-notifications/commit/29eed9806d93643b5e99147e930b99a2552b2f50))
* also account for the network ID ([e10fc9b](https://github.com/kleros/gtcr-notifications/commit/e10fc9b16d528ef510f6abfa01f441ef249df6c2))
* don't use unread field ([2aa7573](https://github.com/kleros/gtcr-notifications/commit/2aa757362564b7971dc1d913c51a77807769f470))
* handle arbitrator actions ([30ddf2b](https://github.com/kleros/gtcr-notifications/commit/30ddf2b10cce873a380420119fc894d81a7682ed))
* implement delete all notifications ([8a4da44](https://github.com/kleros/gtcr-notifications/commit/8a4da4494df1205092ee5dd8fb44b15a49984eb9))
* implement delete notification ([8da2409](https://github.com/kleros/gtcr-notifications/commit/8da24090cf65709be8890b349d2aff08bbba4e5b))
* remove set interval and immediatly start listening for events ([a351e30](https://github.com/kleros/gtcr-notifications/commit/a351e3034c3f76e109721cc795c62c2c8d9bbf42))
* setup dispute listener ([92fce87](https://github.com/kleros/gtcr-notifications/commit/92fce874bce1f77610df49c3ce3091416d5f0fd9))
* subscribe for events and return saved notifications ([e150185](https://github.com/kleros/gtcr-notifications/commit/e1501859e58c3b94b75caeca12c0bc9386fe4888))
* use checksummed addresses and restart bot periodically ([f524bde](https://github.com/kleros/gtcr-notifications/commit/f524bde1a8ee886f07cbdff14a4c303f9f642c73))


### Bug Fixes

* arbitrator event handling ([e5aba60](https://github.com/kleros/gtcr-notifications/commit/e5aba608f3a6d7651c7fbdb61bb044cc22066dea))
* handle missing subscriber entry on db and update on event ([9eb1aa4](https://github.com/kleros/gtcr-notifications/commit/9eb1aa4a71c2a785ae1b9773dd743789e519cd8e))
* missing parameters and dependencies ([6f3fd51](https://github.com/kleros/gtcr-notifications/commit/6f3fd51552045aa8172ceb5bb239c0eb8e8efb38))
* typo in object name ([1369743](https://github.com/kleros/gtcr-notifications/commit/1369743c444c3e71c4439f030e1f7ba346e0df38))
* use latest tcrs object on event received ([6bdffc5](https://github.com/kleros/gtcr-notifications/commit/6bdffc50189135e584c38eef70f98af3e159fd12))
* use notification types agnostic to the receiver ([46f8291](https://github.com/kleros/gtcr-notifications/commit/46f8291a102aeabe0278f3f7ca6a823434562f8f))
* use put and set endpoint cors headers ([359e448](https://github.com/kleros/gtcr-notifications/commit/359e4486ae7b2aaa3946b0329437a96512866028))

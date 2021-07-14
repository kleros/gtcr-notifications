<p align="center">
  <b style="font-size: 32px;">Generalized TCR Notifications</b>
</p>

<p align="center">
  <a href="https://standardjs.com"><img src="https://img.shields.io/badge/code_style-standard-brightgreen.svg" alt="JavaScript Style Guide"></a>
  <a href="https://conventionalcommits.org"><img src="https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg" alt="Conventional Commits"></a>
  <a href="http://commitizen.github.io/cz-cli/"><img src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg" alt="Commitizen Friendly"></a>
  <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg" alt="Styled with Prettier"></a>
</p>

Service and database for handling Generalized TCR contract events.

## Prerequisites

- Volta.sh - Recommended
- NodeJS version 14

## Get Started

1.  Clone this repo.
2.  Duplicate `.env.example`, rename it to `.env` and fill in the environment variables.
3.  Run `yarn` to install dependencies and then `yarn start` to run the service in development mode.

### Production

1. Create a `.env` file with the name of the network you wish to use. Example `.env.xdai`.
2. Look into `package.json` for the appropriate script (e.g. start:xdai). Create one if it does not yet exist.
3. Use PM2 like so: `pm2 start yarn --interpreter bash --name gn-<network> -- start:<network>`, replacing `network` with the network name.

Example for xDai:
`pm2 start yarn --interpreter bash --name gn-xdai -- start:xdai`

## Other Scripts

- `yarn format` - Lint, fix and prettify all the project.
.js files with styled components and .js files.
- `yarn run cz` - Run commitizen.

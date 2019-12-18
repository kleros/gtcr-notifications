<p align="center">
  <b style="font-size: 32px;">Generalized TCR Notifications</b>
</p>

<p align="center">
  <a href="https://standardjs.com"><img src="https://img.shields.io/badge/code_style-standard-brightgreen.svg" alt="JavaScript Style Guide"></a>
  <a href="https://david-dm.org/kleros/gtcr-notifications"><img src="https://david-dm.org/kleros/gtcr-notifications.svg" alt="Dependencies"></a>
  <a href="https://david-dm.org/kleros/gtcr-notifications?type=dev"><img src="https://david-dm.org/kleros/gtcr-notifications/dev-status.svg" alt="Dev Dependencies"></a>
  <a href="https://conventionalcommits.org"><img src="https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg" alt="Conventional Commits"></a>
  <a href="http://commitizen.github.io/cz-cli/"><img src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg" alt="Commitizen Friendly"></a>
  <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg" alt="Styled with Prettier"></a>
</p>

Service and database for handling Generalized TCR contract events.

## Prerequisites

- NodeJS version 10

## Get Started

1.  Clone this repo.
2.  Duplicate `.env.example`, rename it to `.env` and fill in the environment variables.
3.  Run `yarn` to install dependencies and then `yarn start` to run the service in development mode.

> To run the service in production mode use `node -r dotenv/config index.js`.

## Other Scripts

- `yarn run prettify` - Apply prettier to the entire project.
- `yarn run lint:js` - Lint the entire project's .js files.
- `yarn run lint:js --fix` - Fix fixable linting errors in .js files.
- `yarn run lint` - Lint the entire project's .js files with styled components and .js files.
- `yarn run cz` - Run commitizen.

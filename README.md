# PicksApp-Loopback

[![Build Status](https://travis-ci.org/silverlogic/PicksApp-Loopback.svg?branch=master)](https://travis-ci.org/silverlogic/PicksApp-Loopback)

The backend API for XtraPoints in collaboration with IBM

## Technology

* Node.js 8.1.*
* NPM 5.0.*
* Loopback 3.0.*
* VS Code 1.13.*
* IBM Bluemix

## Requirements For Installing Locally

* OSX
* Node.js 8.1.*
* NPM 5.0.*
* Loopback 3.0.*
* Docker

## Installation

### Node.js/NPM
When installing Node, NPM automatically comes with Node. To install the latest version of Node, we recommend using [Homebrew](https://brew.sh/). Once homebrew is installed, install Node in the terminal doing `$ brew install node`. Verify that both Node.js and NPM were installed successfully bying do `$ node -v` and `$ npm -v`.

### Docker
If you would like to run the API locally without needing to run different commands, we recommend using Docker. Setting up Docker is simple

1. Download the Docker Community Edition For Mac at https://store.docker.com/search?type=edition&offering=community
1. In a terminal, install the Postgres docker image by doing `$ docker pull postgres`.
1. Then install the Node docker image by doing `$ docker pull node`.

### Loopback
You will need Loopback installed in order to use the command line interface. Installing is simple by doing `$ npm install -g loopback-cli`.

### Setup
Now that we have the requirements installed, we can begin setting up our local environment. 

1. In a terminal, do `$ git clone git@github.com:silverlogic/PicksApp-Loopback.git`.
1. Go to the root of the project by doing `$ cd PicksApp-Loopback`.
1. Now we need to build the dependencies by doing `$ npm install`.
1. Now the project can be opened in any source editor for modifying.

## Running Locally
When running locally, the base url will be `http://0.0.0.0:3000`. The explorer can be accessed by `http://0.0.0.0:3000/explorer`.

### Run Development Environment When Developing
When adding new features or testing different things locally, you should use the development environment so that staging or production environments aren't effected. To run the project, do `$ docker-compose up`. To stop running the server, hit control c on the keyboard.

## Mock Season
When testing on staging, a static mock schedule is used that simulates a week in a NFL season. Instead of taking a week for submitted picks to be calculated, this gets done on a daily basis. Here is a schedule on how it works:

* From 9:00pm to 12:00pm, the API will retrieve a schedule that has games that have not started yet.
* From 1:00pm to 7:00pm, the API will retrieve a schedule that has some games that have completed.
* At 8:00pm, The API will retrieve a schedule that has all games completed. Each game will have a game status as either `FINAL ` or `FINAL OT`. When this happens, the API will look at the submitted picks for the week and determine how users will earn or lose points in a group. When this process finishes, the API will then create a new `Week` for active `Season` instances if the current NFL season isn't over. If the season ends, then new `Season`, `Week`, and `Score` instances are created for all existing groups.

On the client side, when testing in staging, you would use the `/Schedules/mock-schedule` route for retrieving a schedule and submitting picks against it. You have until 7:59pm to submit picks before the server starts its process at 8:00pm.
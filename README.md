# 326 Project

## Team

| Name | GitHub Username |
|---|---|
| Alexander Genov | Axgenov |
| Benjamin Hamilton | Benhammy96 |
| Mena Ibeku | MenaIbeku |

## Working Agreement

1. Communication will be done through iMessage. We have a dedicated group chat and will meet over FaceTime or in person depending on team availability.
2. Monday through Friday, the team will meet after 4:00 PM for daily scrum calls and code reviews to go over completed work and debugging.
3. PRs will be considered complete when the other two team members review and approve the PR.
4. Disagreements will be resolved by a team vote, with the majority deciding how to move forward.

## Project Domain

1. Study Space Finder is an app that helps students locate open study spaces on campus in real time.

2. It's built for any student trying to find a quiet room, library seat, or common area to work between classes.

3. Right now, students waste time wandering between buildings or settling for crowded, noisy spots because there's no easy way to see what's actually free.

4. The app solves this by letting students submit and view study spaces with details like location, noise level, and whether the space is good for groups.

5. Beyond the class, the same model could scale to any campus or shared workspace, cutting down on a small but real daily friction point for students trying to focus.

## Study Space Feature

Users can add a study space from the `/spaces` page.

The form collects:
- name
- location
- noise level
- whether the space is group friendly

When the form is submitted, the browser sends a POST request to `/spaces`. The service validates the input, the repository saves the space to MongoDB, and the page reloads to show the saved study space.

## System Diagram

Browser Form
    ↓
POST /spaces
    ↓
Route
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
MongoDB

## Design Decisions

**Benjamin Hamilton:** I kept the validation in the service layer instead of putting it in spacesController.js. We could’ve validated everything in the controller, but that would’ve mixed the request handling with the actual app rules. Keeping it in the service makes the controller cleaner and the validation easier to reuse.

**Mena Ibeku:** ...

**Alexander Genov:** ...
I kept the databases separate into speacesRepository.js, with listSpaces() and createSpace() providing the access to stored study spaces. This in turn keeps the storage code seapare from request handling and validation so that database changes are much easier to maintain. Mongoose was the schema I used to define the fields and defaults, and I returned plain objects so that the service layer can use results without having to depend on Mongoose Documents.


### Getting Started

Follow these steps to get Study Space Finder running on your local machine.

#### 1. Clone the repository

Open a terminal and run:

git clone https://github.com/MenaIbeku/326project

Then navigate into the project directory:

cd 326project

#### 2. Install dependencies

Make sure Node.js 22.16 or newer and npm are installed on your computer.

Install the project's dependencies:

npm install

#### 3. Configure MongoDB

Copy `.env.example` to `.env`:

```sh
cp .env.example .env
```

Set `MONGODB_URI` in `.env` to your MongoDB connection string. The example uses
a local MongoDB instance at `127.0.0.1:27017` with database `study_space_finder`.
Start MongoDB separately, or use a MongoDB Atlas connection string. Never commit
`.env` or database credentials. `PORT` defaults to `3000`.

The server connects to MongoDB before listening. If the connection fails, it exits
with an error instead of accepting requests without storage.

#### 4. Start the application

Start the server using:

npm start

#### 5. Open the application

Once the server starts successfully, open a browser and navigate to:

http://localhost:3000

The Study Space Finder application should now be running locally.

Database layer (Alex)

- `config/database.js` mongoose connect
- `models/Space.js`: spaces in the storage schema 
- `repositories/spacesRepository.js`: reads and creates database records.

fields: `name` (string), `location` (string), `noiseLevel` (string),
`groupFriendly` (boolean, default `false`), and `isAvailable` (boolean, default `true`).
Name, location, and noiseLevel are required by the storage schema.
MongoDB - `_id`; Mongoose - `createdAt` and `updatedAt`.

Mena's section can use the repository directly:

```js
import * as spacesRepository from "../repositories/spacesRepository.js";

const spaces = await spacesRepository.listSpaces();
const space = await spacesRepository.createSpace({
  name: "Library Room 201",
  location: "Main Library, second floor",
  noiseLevel: "quiet",
  groupFriendly: true,
});
```

`listSpaces()` resolves array of plain objects, newest first (or `[]`).
`createSpace(data)` resolves saved plain object, including its `_id` and timestamps.

Both reject in the case of database errors
listed space fields and does not handle HTTP, business rules, or result envelopes.
The existing HTTP routes still return placeholder text until the controller and
service are connected.

Run `npm test` for schema checks.

### Development Workflow

Before beginning new work, make sure your local `main` branch is up to date:

git switch main
git pull origin main

Create a new branch for your work:

git switch -c <branch-name>

After making your changes, commit and push your branch:

git add .
git commit -m "Describe your changes"
git push -u origin <branch-name>

Then open a pull request on GitHub. According to the team's working agreement, a pull request is considered complete after it has been reviewed and approved by the other two team members.

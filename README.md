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

```text
GET /spaces
Browser -> Router -> Controller -> Service -> Repository -> MongoDB
MongoDB -> Repository -> Service -> Controller -> EJS page -> Browser

POST /spaces
Form -> app.js (fetch JSON) -> express.json() -> Router -> Controller
Controller -> Service (validation) -> Repository -> MongoDB
MongoDB -> Repository -> Service -> Controller -> 201 JSON -> app.js
app.js -> reload page -> GET /spaces shows the saved space

Error handling
Invalid input -> Service -> Controller -> 400 JSON
Malformed JSON -> Error middleware -> 400 JSON
Rejected promise -> asyncHandler -> next(err) -> Error middleware -> 500 JSON

app.js displays POST errors and connection failures to the user.
```

## Design Decisions

Benjamin Hamilton: I kept the validation in the service layer instead of putting it in spacesController.js. We could’ve validated everything in the controller, but that would’ve mixed the request handling with the actual app rules. Keeping it in the service makes the controller cleaner and the validation easier to reuse.

Mena Ibeku: I decided to handle input validation in the service layer instead of the controller. An alternative would have been to validate the submitted study space information directly in the controller before passing it to the repository. However, this would mix HTTP request handling with business logic, making the controller more complex and reducing the reusability of the validation rules. By placing validation in the service layer, the controller can focus on handling requests and responses, while the service ensures that only valid study space information reaches the repository. This approach also makes it easier to modify validation rules as our application develops.

For Sprint 3, I decided to use Jest's unstable_mockModule to mock our repository when testing the service layer. An alternative would have been to run tests against our actual MongoDB database, but that would make the tests slower and dependent on a working database connection. Mocking the repository allows us to test our validation and business rules independently, making tests faster, more reliable, and easier to debug.



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

Generate a session secret and paste its output into `SESSION_SECRET` in `.env`:

```sh
node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'
```

Keep this secret private and stable across restarts and app instances. The server
requires at least 32 bytes; it does not provide a fallback secret. Changing it
invalidates existing session cookies. Use `NODE_ENV=development` for local HTTP.
In production, set `NODE_ENV=production` and serve the app over HTTPS. Set
`TRUST_PROXY=1` only when the app runs behind exactly one trusted reverse proxy
that supplies the original protocol and preserves the host header.

The server connects to MongoDB before listening. If the connection fails, it exits
with an error instead of accepting requests without storage. Startup also waits
for the unique user email index and the session expiry index.

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

listSpaces() and createSpace() reject on database errors. The repository only handles storage and does not contain HTTP handling, validation, or business logic.

Run `npm test` for service tests. Run `npm run test:node` for schema, repository,
and authentication integration tests. The integration tests require `mongod`
on your PATH (or `MONGOD_BINARY` set to its executable path). They start isolated
temporary databases and do not use the database configured in `.env`.

### Sprint 4: User accounts and authentication (Alex)

The Mongoose model is registered as **`"User"`** in `models/User.js`. It stores
required `name`, normalized unique `email`, a bcrypt `passwordHash`, and a `role`
limited to `member` or `admin`, defaulting to `member`. It also records timestamps.
`passwordHash` is excluded from ordinary reads and document serialization.

`repositories/usersRepository.js` provides:

| Method | Behavior |
| --- | --- |
| `createUser({ name, email, passwordHash })` | Saves a new member. Ignores supplied roles and all extra fields. |
| `findById(id)` | Returns a plain user object or `null`; rejects malformed IDs. |
| `findByEmail(email)` | Normalizes the email and returns a plain user object or `null`. |
| `findByEmailForAuthentication(email)` | Includes the hash for server-side password comparison only. |
| `createAdmin({ name, email, passwordHash })` | Trusted operator use only; inserts an admin and never upgrades an existing account. |

The repository accepts an already generated hash. `services/authService.js`
validates account input and hashes passwords with bcrypt at cost 12 before calling
it. Passwords need at least 12 Unicode characters, cannot be entirely whitespace,
and must fit within bcrypt's 72-byte UTF-8 limit. Passwords are not trimmed.
Names are trimmed and limited to 100 characters; emails are trimmed, lowercased,
and checked for basic address format. Duplicate emails return `409`.

The JSON endpoints are:

| Method and path | Body | Success |
| --- | --- | --- |
| `POST /auth/signup` | `{ "name": "...", "email": "...", "password": "..." }` | `201 { "user": { ... } }`; creates a member and starts their session. |
| `POST /auth/login` | `{ "email": "...", "password": "..." }` | `200 { "user": { ... } }`; verifies credentials and starts a new session. |
| `POST /auth/logout` | `{}` or no body (JSON header required) | `204`; destroys the session and clears its cookie. |
| `GET /auth/me` | None | `200 { "user": { ... } }`, or `401` when logged out. |

All POST requests must send `Content-Type: application/json`. Authentication
writes reject a different `Origin` when one is supplied; these endpoints are
intended for a frontend served from the same origin. Validation failures return
`400`, wrong credentials return `401`, and errors use `{ "error": "..." }`.
Responses never include passwords or password hashes. There are no signup/login
pages in this change; the endpoints are ready for the team's frontend integration.

After signup or login, the server regenerates and saves the session before sending
the response. The agreed integration fields are:

```js
req.session.userId // String version of the authenticated User's MongoDB _id
req.session.role   // "member" or "admin", read from the saved User
```

`express-session` uses `connect-mongo` and the existing MongoDB connection to
store sessions in the `sessions` collection. The browser receives only a signed
session ID in the `study-space.sid` cookie. Cookies are HTTP-only, use
`SameSite=Lax`, expire after eight hours, and require HTTPS in production.
MongoDB automatically removes expired session records through a TTL index.

Session middleware is mounted before the `/spaces` routes so the team's
`requireLogin` middleware and service authorization checks can use these fields.
This change supplies authentication; applying access rules to study-space routes
remains with that authorization work.

#### Creating an admin securely

From a trusted terminal on a machine with authorized database access, configure
`MONGODB_URI` in your private `.env`, then run:

```sh
npm run create-admin
```

Enter the admin's name and email, then enter and confirm a password. Password input
is hidden. The command hashes it using the same service as signup and inserts an
admin account. An existing email is rejected without changing its role or password.
The command accepts no arguments or piped input, so passwords do not need to appear
in shell history or configuration files. Protect database credentials and access
to the host that runs this command. There is no public admin-creation endpoint or
default admin password. Creating an admin does not log in; use `/auth/login` next.

Public signup always calls the member-only creation method. Supplying `role`,
`userId`, `passwordHash`, or nested session fields in a request cannot grant admin
access or replace the server-generated account identity.

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

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

When the form is submitted, HTMX sends a POST request to `/spaces`. The service validates the input and the repository saves the space to MongoDB. The controller returns an EJS list-item partial, which HTMX inserts at the top of the list without reloading the page. Validation errors appear below the form, and a successful submission resets the fields.

Click a study-space name to view `/spaces/:id` using its MongoDB `_id`. To test, add a space, click its name, and reload the detail page to confirm the same record appears.

## Sprint 3 Changes

| Change | Implementation |
|---|---|
| MongoDB | Mongoose stores study spaces. The repository supports list, find, create, update, and delete operations using MongoDB IDs. |
| Jest | Service tests mock the repository with `jest.unstable_mockModule`, so the unit tests do not need a database. |
| HTMX | The add-space form swaps server-rendered HTML into the existing list instead of using handwritten fetch and reload code. |
| Tailwind | Local Tailwind CLI commands build the stylesheet. Utility classes provide a stacked mobile layout and two desktop columns. |

## System Diagram

```text
GET /spaces and GET /spaces/:id
Browser -> Router -> Controller -> Service -> Repository -> MongoDB
MongoDB -> Repository -> Service -> Controller -> EJS page -> Browser

POST /spaces through HTMX
Form (hx-post) -> HTMX -> URL-encoded body -> Router -> Controller
Controller -> Service (validation) -> Repository -> MongoDB
MongoDB -> Repository -> Service -> Controller -> EJS partial (201 HTML)
HTMX -> insert partial into #space-list without a page reload

HTMX error handling
Invalid input -> Service -> Controller -> error partial (400 HTML)
Database write failure -> Controller -> error partial (500 HTML)
HTMX -> swap error partial into #form-error
Connection failure -> htmx:sendError -> app.js -> #form-error

POST /spaces for JSON API clients
JSON body -> express.json() -> same Router -> Controller -> Service
POST requests without HX-Request receive JSON success or error responses
Unhandled route errors -> asyncHandler -> error middleware -> JSON error
Malformed JSON -> error middleware -> 400 JSON

Tests
Jest unit tests -> Service -> Mocked repository (no MongoDB connection)
Node integration tests -> Real repository -> Temporary MongoDB

Styles
Tailwind CLI -> scan view utility classes -> public/styles.css -> Browser
```

## Design Decisions

Benjamin Hamilton: I kept the validation in the service layer instead of putting it in spacesController.js. We could’ve validated everything in the controller, but that would’ve mixed the request handling with the actual app rules. Keeping it in the service makes the controller cleaner and the validation easier to reuse.

For Sprint 3, I used HTMX for the add-space form instead of keeping the fetch request and reloading the page. HTMX let the server return the new space directly, so I needed less frontend JavaScript and the page did not have to reload. Keeping fetch would have meant more JavaScript or a full-page reload after every submission.

Mena Ibeku: I decided to handle input validation in the service layer instead of the controller. An alternative would have been to validate the submitted study space information directly in the controller before passing it to the repository. However, this would mix HTTP request handling with business logic, making the controller more complex and reducing the reusability of the validation rules. By placing validation in the service layer, the controller can focus on handling requests and responses, while the service ensures that only valid study space information reaches the repository. This approach also makes it easier to modify validation rules as our application develops.

For Sprint 3, I decided to use Jest's unstable_mockModule to mock our repository when testing the service layer. An alternative would have been to run tests against our actual MongoDB database, but that would make the tests slower and dependent on a working database connection. Mocking the repository allows us to test our validation and business rules independently, making tests faster, more reliable, and easier to debug.

**Alexander Genov:** ...
I kept the databases separate into speacesRepository.js, with listSpaces() and createSpace() providing the access to stored study spaces. This in turn keeps the storage code seapare from request handling and validation so that database changes are much easier to maintain. Mongoose was the schema I used to define the fields and defaults, and I returned plain objects so that the service layer can use results without having to depend on Mongoose Documents. For sprint 3 I chose findByIdAndUpdate to update the individual study spaces, an alternative would be to retireve the spacew with the findbyID and modify the mongoose document and call save() after. I rather decided to directly update in this case since it avoids a separate read and does the changes in one databse operation. Changing one room availability should only update the specific room at hand and saving the whole list would read and write unrelated spaces and could overwrite another users changes if said list is outdated. The implementation we decided on only selects the record's allowed fields and the integration tests verify that the ID and unchanged fields remain preserved.
### Getting Started

Follow these steps inside the course dev container.

### 1. Clone the repository

Open a terminal and run:

```sh
git clone https://github.com/MenaIbeku/326project
```

Then navigate into the project directory:

```sh
cd 326project
```

### 2. Start the application

Make sure Node.js 22.16 or newer and npm are installed on your computer.

Copy the example configuration, start the container's MongoDB service, install dependencies, and start the app:

```sh
cp .env.example .env
dc-up mongo
npm install
npm start
```

The example connects to the dev container's `mongo` service and `devdb` database. Keep `.env` out of Git. `PORT` defaults to `3000`.

The server connects to MongoDB before listening. If the connection fails, it exits
with an error instead of accepting requests without storage.

The `prestart` script builds `public/styles.css` with the locally installed Tailwind CLI before starting Express.

### 3. Open the application

Once the server starts successfully, open a browser and navigate to:

[http://localhost:3000/spaces](http://localhost:3000/spaces)

Use the port from `.env` if you changed `PORT`. The `/` route only displays the application name.

### MongoDB Repository

- `config/database.js`: connects to MongoDB.
- `models/Space.js`: defines the storage schema.
- `repositories/spacesRepository.js`: reads, creates, updates, and deletes records.

The schema requires `name`, `location`, and `noiseLevel` strings. It also stores
`groupFriendly` (boolean, default `false`), `isAvailable` (boolean, default `true`),
and optional `capacity` (number). MongoDB supplies `_id`; Mongoose supplies
`createdAt` and `updatedAt`.

| Repository method | Result |
|---|---|
| `listSpaces()` / `getAll()` | Plain objects, newest first, or an empty array. |
| `findById(id)` | One plain object, or `null` if the record is missing. |
| `createSpace(data)` / `create(data)` | The saved plain object, including its `_id` and timestamps. |
| `updateById(id, changes)` | The updated plain object, or `null` if the record is missing. |
| `removeById(id)` | The deleted plain object, or `null` if the record is missing. |

Per-record methods accept MongoDB ObjectIds or their 24-character hexadecimal strings and reject malformed IDs. Updates allow only the editable schema fields and run schema validation. The service handles business-rule validation; the repository handles storage. The browser supports listing, creating, and viewing individual spaces. Update and delete are available at the repository layer.

The service calls the repository, for example:

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

## Tests

Run the Jest service tests:

```sh
npm test
```

These tests are in `_tests_/spacesService.test.js`. They use `jest.unstable_mockModule` before importing the service to replace the repository with mock functions. They check validation, defaults, capacity limits, successful creation, and repository errors. MongoDB does not need to be installed or running for this command.

Run the separate Node schema and repository integration tests:

```sh
npm run test:node
```

The integration tests need a local `mongod` executable on `PATH`. If it is installed elsewhere, set `MONGOD_BINARY` to its full path. They start a temporary MongoDB instance on a free port, use a temporary data directory, and clean it up afterward. They do not use the application's `MONGODB_URI` or require a MongoDB server to be running beforehand. These tests check the same ID through create, list, find, update, and delete, as well as invalid IDs, partial updates, and protected fields.

## Sprint 3 Verification

### MongoDB Persistence

1. Run `dc-up mongo`, then `npm start`.
2. Open `/spaces` and add a study space with a recognizable name.
3. Stop the app with Ctrl+C, leave MongoDB running, and run `npm start` again.
4. Reload `/spaces`. The saved space should still be listed.

Use `npm run test:node` to verify the repository's per-record ID operations.

### HTMX Form

HTMX is loaded from a pinned CDN URL, so the browser needs internet access to load it.

1. Open `/spaces` and the browser's developer tools Network tab.
2. Submit an empty form. A POST should return `400` with an HTML error partial, and the error should appear below the form.
3. Enter a name, location, and noise level, then submit again. Try the group-friendly checkbox both checked and unchecked.
4. The POST should include `HX-Request: true` and return `201` with one `<li>` HTML partial. The new space should appear first and the form should reset without a new page request.

POST requests without the HTMX header still receive JSON for existing API clients.

### Tailwind Build and Layout

Tailwind utilities are written directly in the EJS views. `styles/input.css` imports Tailwind, and the CLI generates `public/styles.css`, which `/spaces` loads.

`npm start` builds the stylesheet automatically. To build it separately, run:

```sh
npm run build:css
```

While editing utility classes, run this in another terminal to rebuild on changes:

```sh
npm run watch:css
```

Use the browser's responsive viewport tool to check `/spaces` at these widths:

- **375px:** the form is above the list, and the page fits without horizontal scrolling.
- **1280px:** the form and list are side by side. The `md:grid-cols-2` utility makes this layout change.

## Development Workflow

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

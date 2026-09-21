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

4. The app solves this by aggregating space availability, through crowdsourced check-ins, occupancy sensors, or scheduling data, into a simple map or list students can filter by noise level, outlets, or group size.

5. Beyond the class, the same model could scale to any campus or shared workspace, cutting down on a small but real daily friction point for students trying to focus.


### Getting Started

Follow these steps to get Study Space Finder running on your local machine.

#### 1. Clone the repository

Open a terminal and run:

git clone https://github.com/MenaIbeku/326project

Then navigate into the project directory:

cd 326project

#### 2. Install dependencies

Make sure Node.js and npm are installed on your computer.

Install the project's dependencies:

npm install

#### 3. Start the application

Start the server using:

npm start

#### 4. Open the application

Once the server starts successfully, open a browser and navigate to:

http://localhost:3000

The Study Space Finder application should now be running locally.

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

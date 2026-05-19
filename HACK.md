# LIVEHACK — Live Coding Guide for Global AI Community Meetups

## Overview

This guide walks you through presenting **Wheel of Names** as a live-coding demo at a [Global AI Community](https://globalai.community/) meetup. The goal is to build a working, audience-interactive spinning wheel in ~30 minutes, using [VS Code](https://code.visualstudio.com/) + [GitHub Copilot](https://github.com/features/copilot) as the centrepiece of the talk.

**What the audience gets:** they scan a QR code from your screen, enter their name, watch it appear live on the wheel, and one of them wins a prize. Full loop, real-time, no server setup on stage.

## 📱 Scan to Join

![QR Code – Join the Wheel](qrcode.png)

👆 Scan this QR code to open the Wheel of Names and join the game!

---


# ☝️ Set up your machine

Complete these steps **before** the meetup. Estimated time: ~20 minutes.

### 1. Create a GitHub account

1. Go to [github.com/signup](https://github.com/signup)
2. Enter your email, create a password, and choose a username
3. Verify your email address
4. On the plan page choose **Free**


### 2. Install VS Code

Download and install [Visual Studio Code](https://code.visualstudio.com/download) for your OS.  
Launch it once to confirm it starts correctly.

### 3. Set up an AI coding assistant

#### Recommended: GitHub Copilot (built into VS Code)

[GitHub Copilot is built into VS Code](https://code.visualstudio.com/docs/copilot/setup) — no extension install needed.

1. Open VS Code
2. Click the **Accounts** icon in the bottom-left Activity Bar
3. Choose **Sign in with GitHub to use GitHub Copilot**
4. Complete the browser OAuth flow and return to VS Code
5. You need Github Copilot Pro 
6. Chat user Sonnet 4.6 or better Opus 4.6 to develop with Copilot Chat.

---

# 👉 Start The Live hack! 

## 1. Explain Github Copilot What You Want To Build


> In our last Global AI Community event. Zaid gave out Swaggs and Merch and use a wheel of names to pick 5 winners of over 200. He used a shady website with ads and trackers. Not very GDPR compliant. So today we're going to build our own wheel of names — We need a QR code that anyone can scan with their mobile to join the wheel game. Use the community look and feel from this website:  https://globalai.community/chapters/berlin/events/agentcon-berlin-2026/
>
> Create a new public  Github repository called "wheel2". Deploy it to Github Pages. So create a modern type script app in a single index.html file.  start teh server locally. install everything you need for this locally. Use git and GH CLI. If you dont find it, install it.  

## 2. Start the web server locally

You should see the QR Code and a working wheel of names.

### 3. QR Code Join Flow 

Install firebase CLI tools, login and create a new project for the wheel of names.


> Now implement the mobile join flow. When a user submits their name, it should be added to a Firebase Realtime Database.  Create a mobile view after scanning the QR code and input youur name. He can only join once. So check if the name already exists in the wheel or in the pending list before adding it to Firebase.
>
> Never store secrets in the Github repo.
> The presenter have a minimize full screen presenter view andcan reset the names and delete the names from the database.


# Optional

## 4. Sound & confetti

> create sounds and confetti for the winner!


## 5. Presentation Mode
> Presentation mode: fullscreen overlay with a larger canvas.
> QR code in the corner showing the ?join URL.
> Use keyboard shortcuts: and show the shortcuts on the screen when the presenter presses "?"
>
> Show in realtime the joined people with emojis and names. add the people on the wheel automatically.


## 6. Multi Tenancy
> Implement multi-tenancy so that multiple events can run their own wheel in the same time. So when you create a new wheel, it generates a unique ID and the QR code points to that ID. The Firebase data structure should support multiple wheels with their own set of names.
---

# 🙌 Sponsor

[![Sopra Steria](https://www.soprasteria.de/ResourcePackages/Bootstrap4/assets/dist/logos/logo-soprasteria.svg)](https://www.soprasteria.de/en/)

This event is proudly sponsored by **[Sopra Steria Germany](https://www.soprasteria.de/en/)** — one of Europe's leading digital transformation partners, with deep expertise in AI, cloud, and IT consulting.

Sopra Steria helps organisations across financial services, public sector, and industry navigate complex technology change. They are active supporters of the developer community in Germany.


---

## Work at Sopra Steria Germany

Thank you for building this demo with me! If you enjoyed this session and are interested in building things like this for a living? **[Sopra Steria Germany](https://www.soprasteria.de/en/)** is hiring across technology, AI, and consulting roles. Browse all open positions at **[careers.soprasteria.de](https://careers.soprasteria.de/)**.

Here are roles well-suited to the skills shown in this hackathon:

| Role | What you'll do | Locations |
| --- | --- | --- |
| [**AI & Data Consultant**](https://careers.soprasteria.de/) | Design and implement AI/ML solutions for enterprise clients | Hamburg, Berlin, Munich, Frankfurt |
| [**Software Engineer (Full-Stack)**](https://careers.soprasteria.de/) | Build modern web apps and APIs; work in agile teams | Hamburg, Berlin, Düsseldorf |
| [**Cloud Architect**](https://careers.soprasteria.de/) | Design cloud-native architectures on AWS, Azure, or GCP | Hamburg, Munich, Frankfurt |
| [**IT Consultant — Digital Transformation**](https://careers.soprasteria.de/) | Lead end-to-end digital projects for public sector and enterprise clients | Nationwide |
| [**Agile Coach / Scrum Master**](https://careers.soprasteria.de/) | Embed agile ways of working in large organisations | Hamburg, Berlin, Munich |
| [**Cyber Security Consultant**](https://careers.soprasteria.de/) | Advise on security architecture, compliance, and resilience | Hamburg, Berlin, Frankfurt |

> All roles are listed at [careers.soprasteria.de](https://careers.soprasteria.de/). Sopra Steria Germany offers hybrid working, a strong learning culture, and an active tech community.
---
title: Media
date: 2026-04-25
type: landing

sections:
  - block: markdown
    content:
      title:
      text: |-
        <section class="media-hub-intro">
          <p class="media-hub-kicker">Media</p>
          <h1>News, blogs, events and photos from the VR Lab.</h1>
          <p>Follow the lab's latest research updates, event activity, public stories and snapshots from workshops, demonstrations and visits.</p>
          <div class="media-hub-links">
            <a href="#updates">Latest updates</a>
            <a href="#events">Events</a>
            <a href="#gallery">Photo gallery</a>
            <a href="#resources">Resources</a>
          </div>
        </section>

        <style>
        .media-hub-intro {
          max-width: 980px;
          margin: 3rem auto 1.5rem;
          padding: 2.5rem;
          border: 1px solid #d9e7f5;
          border-radius: 8px;
          background: linear-gradient(135deg, #f8fbff 0%, #eef7ff 100%);
          box-shadow: 0 20px 45px rgba(36, 78, 120, 0.08);
        }
        .media-hub-kicker {
          margin: 0 0 0.85rem;
          color: #3478c9;
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          line-height: 1.2;
          text-transform: uppercase;
        }
        .media-hub-intro h1 {
          max-width: 760px;
          margin: 0;
          color: #111827;
          font-size: 2.45rem;
          line-height: 1.1;
        }
        .media-hub-intro p:not(.media-hub-kicker) {
          max-width: 720px;
          margin: 1rem 0 0;
          color: #536176;
          font-size: 1rem;
          line-height: 1.65;
        }
        .media-hub-links {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }
        .media-hub-links a {
          display: inline-flex;
          align-items: center;
          min-height: 42px;
          padding: 0.65rem 1rem;
          border: 1px solid #9fc2e8;
          border-radius: 8px;
          background: #ffffff;
          color: #17435c;
          font-weight: 700;
          text-decoration: none;
        }
        .media-hub-links a:hover,
        .media-hub-links a:focus {
          border-color: #3478c9;
          color: #12334a;
          text-decoration: none;
        }
        @media (max-width: 760px) {
          .media-hub-intro {
            margin-top: 2rem;
            padding: 1.5rem;
          }
          .media-hub-intro h1 {
            font-size: 2rem;
          }
        }
        </style>

  - block: recent-updates
    content:
      anchor: updates
      kicker: Updates
      title: Latest news and blog posts
      subtitle: Browse the newest stories, announcements and public-facing updates from across the lab.
      count: 9
      sections:
        - post
        - blog
      archive_link:
    design:
      css_class: media-updates

  - block: recent-updates
    content:
      anchor: events
      kicker: Events
      title: Events, talks and visits
      subtitle: Explore seminars, workshops, demos, network visits and public activities hosted or supported by the VR Lab.
      count: 6
      sections:
        - event
      archive_link:
    design:
      css_class: media-events

  - block: markdown
    content:
      title:
      text: |-
        <section id="resources" class="media-resource-card">
          <div>
            <p class="media-resource-kicker">Resources</p>
            <h2>Explore the lab spaces, equipment and workshop facilities.</h2>
            <p>The Resources page brings together details about VR/AR/MR headsets, motion capture, haptics, recording spaces, 3D printing and the VRLab Office.</p>
          </div>
          <a class="media-resource-link" href="/resources/">View resources</a>
        </section>

        <style>
        .media-resource-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 1.5rem;
          align-items: center;
          max-width: 980px;
          margin: 2rem auto;
          padding: 2rem;
          border: 1px solid #d9e7f5;
          border-radius: 8px;
          background: #ffffff;
          box-shadow: 0 16px 36px rgba(36, 78, 120, 0.08);
        }
        .media-resource-kicker {
          margin: 0 0 0.65rem;
          color: #3478c9;
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          line-height: 1.2;
          text-transform: uppercase;
        }
        .media-resource-card h2 {
          margin: 0;
          color: #111827;
          font-size: 1.7rem;
          line-height: 1.2;
        }
        .media-resource-card p:not(.media-resource-kicker) {
          max-width: 680px;
          margin: 0.85rem 0 0;
          color: #536176;
          line-height: 1.65;
        }
        .media-resource-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0.75rem 1.1rem;
          border-radius: 8px;
          background: #17435c;
          color: #ffffff;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
        }
        .media-resource-link:hover,
        .media-resource-link:focus {
          background: #12334a;
          color: #ffffff;
          text-decoration: none;
        }
        @media (max-width: 760px) {
          .media-resource-card {
            grid-template-columns: 1fr;
            padding: 1.5rem;
          }
          .media-resource-link {
            width: 100%;
          }
        }
        </style>

  - block: photo-gallery
    content:
      anchor: gallery
      kicker: Gallery
      title: Photo gallery
      text: A glimpse at the people, hardware and moments behind our research - from headset fittings to public demos and conferences.
---

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

  - block: photo-gallery
    content:
      anchor: gallery
      kicker: Gallery
      title: Photo gallery
      text: A glimpse at the people, hardware and moments behind our research - from headset fittings to public demos and conferences.
---

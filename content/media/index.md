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

  - block: photo-gallery
    content:
      anchor: gallery
      kicker: Gallery
      title: Photo gallery
      text: A glimpse at the people, hardware and moments behind our research - from headset fittings to public demos and conferences.
---

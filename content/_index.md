---
# Leave the homepage title empty to use the site title
title: Home
date: 2022-10-24
type: landing

sections:
  - block: slider
    content:
      slides:
        - title: Welcome to the Virtual Reality Lab
          content: |-
            
          align: Left
          background:
            image: 
                filename: slider_image_1.jpeg
                filters:
                  brightness: 0.45
            position: right
            color: '#666'
          link:
            icon: link
            icon_pack: fas
            text: Contact Us
            url: ../contact/
      
        - title: Research
          content: |-
            The lab focuses on perception, cognition, and action by leveraging virtual reality technology to create immersive environments for detailed psychological studies. Through these efforts, the lab seeks to enhance our understanding of human behavior and mental processes.
          align: left
          background:
            image:
              filename: panoramic_big.jpg
              filters:
                brightness: 0.4
            position: center
            color: '#333'
          link:
            icon: link
            icon_pack: fas
            text: Research
            url: ../projects/
        - title: Interdisciplinarity
          content: |-
            The Virtual Reality Lab in the School of Psychology at the University of Birmingham, led by Dr. Max Di Luca, brings together experts from diverse fields, including Computer Vision, Human-Computer Interaction, Social Sciences, Psychology, Neuroscience, Music, and Sports.
          align: left
          background:
            image: 
                filename: slider_image_2.jpeg
                filters:
                  brightness: 0.7
            position: up
            color: '#666'
    design:
      slide_height: '55vh'
      is_fullscreen: false
      loop: true
      interval: 5000
  - block: recent-updates
    content:
      subtitle: Talks, press releases and project updates from across the lab.
      count: 6
      archive_link: /post/

  - block: markdown
    content:
      title:
      text: |-
        <div class="vrlab-cta">
          <div class="vrlab-cta-text">
            <p class="vrlab-cta-eyebrow">— JOIN THE LAB</p>
            <h2 class="vrlab-cta-heading">Curious about VR research?<br>Let's collaborate.</h2>
            <p class="vrlab-cta-body">We welcome enquiries from prospective PhD students, postdocs, visiting scholars and industry partners interested in immersive psychology research.</p>
          </div>
          <div class="vrlab-cta-actions">
            <a class="vrlab-cta-btn vrlab-cta-btn-primary" href="/opportunities/">Explore opportunities <span aria-hidden="true">→</span></a>
            
          </div>
        </div>

        <style>
        .vrlab-cta {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #f8fafc;
          border-radius: 12px;
          padding: 2.5rem 2rem;
          margin: 2rem auto;
          max-width: 960px;
          display: flex;
          flex-wrap: wrap;
          gap: 2rem;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
        }
        .vrlab-cta-text { flex: 1 1 360px; }
        .vrlab-cta-eyebrow {
          font-size: 0.8rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          opacity: 0.7;
          margin: 0 0 0.6rem;
        }
        .vrlab-cta-heading {
          color: #f8fafc;
          margin: 0 0 0.9rem;
          font-size: 1.6rem;
          line-height: 1.25;
        }
        .vrlab-cta-body {
          color: #cbd5e1;
          margin: 0;
          font-size: 0.95rem;
          line-height: 1.55;
          max-width: 44ch;
        }
        .vrlab-cta-actions {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          flex: 0 0 auto;
        }
        .vrlab-cta-btn {
          display: inline-block;
          padding: 0.65rem 1.25rem;
          border-radius: 8px;
          font-weight: 500;
          text-decoration: none;
          transition: transform 0.15s ease, background 0.15s ease;
          font-size: 0.95rem;
          text-align: center;
          min-width: 220px;
        }
        .vrlab-cta-btn:hover { transform: translateY(-1px); text-decoration: none; }
        .vrlab-cta-btn-primary {
          background: #f8fafc;
          color: #0f172a;
        }
        .vrlab-cta-btn-primary:hover { background: #e2e8f0; color: #0f172a; }
        .vrlab-cta-btn-secondary {
          background: rgba(248, 250, 252, 0.08);
          color: #f8fafc;
          border: 1px solid rgba(248, 250, 252, 0.25);
        }
        .vrlab-cta-btn-secondary:hover { background: rgba(248, 250, 252, 0.16); color: #f8fafc; }
        @media (max-width: 640px) {
          .vrlab-cta { padding: 1.75rem 1.25rem; }
          .vrlab-cta-heading { font-size: 1.35rem; }
          .vrlab-cta-actions { width: 100%; }
          .vrlab-cta-btn { min-width: 0; width: 100%; }
        }
        </style>

---


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
        - title: Academics from different fields
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
        - title: Projects in VR and Research
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
    design:
      slide_height: ''
      is_fullscreen: true
      loop: true
      interval: 5000
  # - block: home
  - block: photo-gallery
    content:
      title: Photo Gallery

---


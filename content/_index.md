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
            We study how people perceive, move, collaborate and create in immersive environments, then use that knowledge to build better virtual, augmented and mixed reality systems.
          align: Left
          background:
            image: 
                filename: slider_image_1.jpeg
                filters:
                  brightness: 0.45
                position: center top
            color: '#666'
          link:
            icon: link
            icon_pack: fas
            text: Explore the lab
            url: ../projects/
      
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
      subtitle: Talks, press releases, blogs and project updates from across the lab.
      count: 6
      archive_link: /post/
      archive_text: View all news

  - block: markdown
    content:
      title:
      text: |-
        <div class="vrlab-pathways">
          <div class="vrlab-pathways-intro">
            <p class="vrlab-pathways-eyebrow">Work with the VR Lab</p>
            <h2 class="vrlab-pathways-heading">A research space for experiments, tools and collaborations in XR.</h2>
            <p class="vrlab-pathways-body">The lab supports work across psychology, computer science, music, sport, robotics, accessibility and the creative industries. Start with the route that best matches what you need.</p>
          </div>
          <div class="vrlab-pathway-grid">
            <a class="vrlab-pathway-card" href="/projects/">
              <span class="vrlab-pathway-title">Collaborate with us</span>
              <span class="vrlab-pathway-text">Explore current research areas, active projects and industry translation work.</span>
            </a>
            <a class="vrlab-pathway-card" href="/resources/">
              <span class="vrlab-pathway-title">Use the lab</span>
              <span class="vrlab-pathway-text">See the spaces, headsets, tracking systems, haptics and fabrication equipment available.</span>
            </a>
            <a class="vrlab-pathway-card" href="/opportunities/">
              <span class="vrlab-pathway-title">Join as a student</span>
              <span class="vrlab-pathway-text">Find routes into PhD work, research assistant roles, projects, training and student activities.</span>
            </a>
          </div>
        </div>

  - block: hero
    content:
      title: Visitor information
      image:
        filename: FindUs.gif
      text: |-
        The Gisbert Kapp building is located across the road from the University North Gate.  
        [Gisbert Kapp on the campus map ](https://campusmap.bham.ac.uk/search/5d6f49101e1f64009327a18c)
        
        <br>
        Enter the Pritchatts Road 52 building through the parking lot. Looking at the Cafe 52, take the elevators on the left to the 4th floor. Exit the elevator on the left and enter the door leading to the corridor. The lab is at the end of the corridor.
       
        <br>
        Please note that access to the Gisbert Kapp corridors requires a UoB ID card. If you don't have one, please get in touch with us before you venture to the lab, so that we can meet you when you exit the elevator.

  - block: contact
    id: contact
    content:
      title: Get in touch
      text: |-
        To get in touch, discuss a collaboration, or ask how to use the lab, please fill in the form below. You will be given access to the lab SharePoint site, where you will find practical details for booking and using the space.
      address:
        street: Pritchatts Road 52
        postcode: "B15 2SA"
        city: Birmingham
        country: United Kingdom
        country_code: UK
      directions: Floor 4 in the Gisbert Kapp Building
      autolink: true
      form:
        provider: netlify
        formspree:
          id:
        netlify:
          captcha: true
    design:
      columns: "1"

---

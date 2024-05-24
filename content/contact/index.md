---
title: Contact
date: 2023-09-20

type: landing

sections:
  - block: contact
    content:
      title: Get in touch
      text: To get in touch and for information on how to use the lab, please fill in this form. You will be given access to the Lab CODA where you will find all details. The lab is located in the Gisbert Kapp building. Entrance is via Pritchatts Road 52. Visitor parking is possible at the nearby multi-storey North East car park.
      address:
        street: Pritchatts Road 52
        city: Birmingham
        postcode: 'B15 2SA'
        country: United Kingdom
        country_code: GB
      coordinates:
        latitude: '52.4531389'
        longitude: '-001.9280278'
      directions: Enter Building and take the elevators on the left to Floor 4
      office_hours:
        - 'Monday/Friday 10:00 to 16:00'
  
      #appointment_url: 'https://calendly.com'
      #contact_links:
      #  - icon: comments
      #    icon_pack: fas
      #    name: Discuss on Forum
      #    link: 'https://discourse.gohugo.io'
    
      # Automatically link email and phone or display as text?
      autolink: true
    
      # Email form provider
      form:
        provider: netlify
        formspree:
          id:
        netlify:
          # Enable CAPTCHA challenge to reduce spam?
          captcha: true
    design:
      columns: '1'
     
  - block: hero
    content:
      title: ''
      image:
        filename: 12989E6E132F480AA0013FE06A7EFABC.png
      text:  text: |
        <br> To reach the lab, across the road from the University North Gate, enter the Psychology building from the Pritchatts Road 52 parking lot. Looking at the Cafe 52, take the elevators on the left to the 4th floor. Exit the elevator on the left and follow the corridor.
      
  - block: markdown
    content:
      title:
      subtitle: ''
      text:
    design:
      columns: '1'
      background:
        image: 
          filename: contact.jpg
          filters:
            brightness: 1
          parallax: false
          position: center
          size: cover
          text_color_light: true
      spacing:
        padding: ['20px', '0', '20px', '0']
      css_class: fullscreen
---

---
title: Contact
date: 2022-10-24

type: landing

sections:
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
    content:
      title: Get in touch
      text: |-
        To get in touch and for information on how to use the lab, please fill in the form below. You will be given access to the Lab CODA where you will find all details. The lab is located in the Gisbert Kapp building. Entrance is via Pritchatts Road 52. Visitor parking is possible at the nearby multi-storey North East car park.
      address:
        street: Pritchatts Road 52
        postcode: "B15 2SA"
        city: Birmingham
        country: United Kingdom
        country_code: UK
      coordinates:
        latitude: "52.45321698704788"
        longitude: "-1.927825815563642"
      directions: Floor 4 in the Gisbert Kapp Building

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
      columns: "1"

  - block: markdown
    content:
      title:
      subtitle: ""
      text:
    design:
      columns: "1"
      background:
        image:
          filename: background.jpg
          filters:
            brightness: 0.5
          parallax: false
          position: center
          size: cover
          text_color_light: true
      spacing:
        padding: ["20px", "0", "20px", "0"]
      css_class: fullscreen
---

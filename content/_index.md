---
# Leave the homepage title empty to use the site title
title: ''
date: 2022-10-24
type: landing

sections:
  - block: hero
    content:
      title: ''
      image:
        filename: welcome.jpg
      text: |
        <br>
        The newly-estabilished Virtual Reality Lab in the School of Psychology at the University of Birmingham is led by Dr Max Di Luca. The goals of the lab are to enable interdisciplinary collaborations and perform research in the fields of perception, cognition and action.  
#  - block: collection
 #   content:
  #    title: Latest News
   #   subtitle:
    #  text:
     # count: 5
      #filters:
#        author: ''
 #       category: ''
  #      exclude_featured: false
   #     publication_type: ''
    #    tag: ''
     # offset: 0
      #order: desc
#      page_type: post
 #   design:
  #    view: card
   #   columns: '1'
  
  - block: markdown
    content:
      title:
      subtitle: ''
      text:
    design:
      columns: '1'
      background:
        image: 
          filename: coders.jpg
          filters:
            brightness: 1
          parallax: false
          position: center
          size: cover
          text_color_light: true
      spacing:
        padding: ['20px', '0', '20px', '0']
      css_class: fullscreen
  
#  - block: markdown
#    content:
#      title:
#      subtitle:
#      text: |
#        {{% cta cta_link="./people/" cta_text="Meet the team →" %}}
#    design:
#      columns: '1'
---
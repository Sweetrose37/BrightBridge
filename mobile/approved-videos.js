/*
 * BRIGHTBRIDGE APPROVED VIDEO DATA
 * --------------------------------
 * Add owner-approved YouTube video IDs in this file, or use the PIN-protected
 * Video Library controls in the mobile Grown-up Area.
 *
 * Only individual, public, non-live videos that allow embedding should be used.
 * Placeholder records are disabled and never appear in the child library.
 */
(function () {
  "use strict";

  window.BB_APPROVED_VIDEO_DATA={
    categories:[
      {id:"speech-communication",label:"Speech & Communication",icon:"💬",color:"#ffe5df"},
      {id:"learning-words",label:"Learning Words",icon:"🔤",color:"#e8e2ff"},
      {id:"feelings-emotions",label:"Feelings & Emotions",icon:"😊",color:"#fff0c9"},
      {id:"social-skills",label:"Social Skills",icon:"🤝",color:"#ddf5ed"},
      {id:"calm-sensory",label:"Calm & Sensory",icon:"🌈",color:"#dff4ff"},
      {id:"songs-movement",label:"Songs & Movement",icon:"🎵",color:"#fce2f0"},
      {id:"story-time",label:"Story Time",icon:"📖",color:"#e6f1ff"}
    ],
    videos:[
      {
        id:"placeholder-speech",
        youtubeId:"",
        title:"Add an approved communication video",
        description:"Replace this disabled placeholder with an individual YouTube video ID.",
        category:"speech-communication",
        thumbnailUrl:"",
        enabled:false,
        sensoryNotes:"",
        recommendedAge:"Caregiver choice",
        placeholder:true
      },
      {
        id:"placeholder-calm",
        youtubeId:"",
        title:"Add an approved calming video",
        description:"Preview the video in the Grown-up Area before enabling it.",
        category:"calm-sensory",
        thumbnailUrl:"",
        enabled:false,
        sensoryNotes:"Review volume, motion, and lighting before approval.",
        recommendedAge:"Caregiver choice",
        placeholder:true
      },
      {
        id:"placeholder-story",
        youtubeId:"",
        title:"Add an approved story video",
        description:"Only manually approved videos appear for children.",
        category:"story-time",
        thumbnailUrl:"",
        enabled:false,
        sensoryNotes:"",
        recommendedAge:"Caregiver choice",
        placeholder:true
      }
    ]
  };
})();

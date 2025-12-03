/* Cormon VR Experience - Virtual Reality on the Modern Web
    Copyright (C) 2023-2024  Yanis M., Matthieu Farcot

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>. */

// NOTE:
// init = start function

var Epoch = Math.floor(new Date().getTime()/1000.0)

var Used = undefined

let IsVR = false, OldMenu = {["pos"]: undefined, ["parent"]: undefined}
var Selected = undefined
var Buttons = {}, Langs = {}

var userLang = (navigator.language || navigator.userLanguage || "fr").split("-")[0]; 
// console.log("LANG => " + userLang)

var SceneData = $("a-scene")
var scene     = SceneData[0]
var MainScene = $("#MainScene")[0]

if(MainScene) MainScene.addEventListener("templaterendered", UpdateNavigator);

// 3D MODEL \\
function updateMaterial(Material, Side) {
  if(!Material) return;
  Material.side = Side
  Material.needsUpdate = true
}

function updateMaterialSide(material, side) {
  if (!material) return;

  if (material instanceof window.THREE.Material) {
    updateMaterial(material, side)
  } else if (material instanceof window.THREE.MultiMaterial) {
    material.materials.forEach(function(childMaterial) {
      updateMaterial(childMaterial, side);
    });
  }
}

function traverse(node) {
  if(!node) return;

  node.children.forEach(function(child) {
    if (child.children) { traverse(child) }
    updateMaterial(child['material'], window.THREE.DoubleSide);
  });
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function getRndInteger(min, max) { return Math.floor(Math.random() * (max - min) ) + min; }

let PathName = location.pathname.split("/")
PathName = (PathName[PathName.length - 1].split(".")[0] || "index").toUpperCase()
console.log(PathName)

async function UpdateNavigator() {
  await sleep(100)

  console.log("navigation update")
  $("#cur_camera")[0].emit("end_trans")
}

async function HideView() {
  $("#cur_camera")[0].emit("start_trans")
}

async function ShowView() {
  $("#cur_camera")[0].emit("end_trans")
}

async function SwitchArea(Name) {
  let ok = document.querySelectorAll(".field")
  ok.forEach(function(val) { $(val).remove() })
  console.log("Changing To Area => " + Name)

  $("#cur_camera")[0].emit("start_trans")
  await sleep(500)

  MainScene.attributes.template.nodeValue = "src: " + "./resources/pages/" + PathName + "/" + Name + ".html"
}

async function OnVRChange() {
  let Menu = $("#Menu")[0]

  if(!Menu) return;

  if(!OldMenu["pos"]) OldMenu["pos"] = AFRAME.utils.coordinates.stringify(Menu.getAttribute("position"));
  if(!OldMenu["parent"]) OldMenu["parent"] = Menu.object3D.parent;

  switch(IsVR) {
    case true:
      $('#leftController')[0].object3D.attach(Menu.object3D)
      Menu.setAttribute('position', "0 0 -.12")
      Menu.setAttribute('rotation', "0 -10 180")
      break;
    case false:
      OldMenu["parent"].attach(Menu.object3D)
      Menu.setAttribute('position', OldMenu['pos'])
      break;
    default:
      console.error("Unknown IsVR Got", IsVR);
      alert("An Error Occured")
  }
}

AFRAME.registerComponent("controller", {
  init: function() {
    this.onDown = this.onDown.bind(this)
    this.onUp = this.onUp.bind(this)

    this.el.addEventListener("mousedown", this.onDown)
    this.el.addEventListener("mouseup", this.onUp)
  },

  onDown: function() { Used = this.el },

  onUp: async function() { await sleep(200); Used = (Used == this.el && undefined) || Used; }
})

AFRAME.registerComponent('toggleclick', {
  init: function () {
    this.onClick = this.onClick.bind(this)
    this.el.addEventListener("click", this.onClick)
  },

  onClick: async function() {
    let ok = document.querySelector(this.el.getAttribute("src"))
    this.el.object3D.visible = !this.el.object3D.visible
    if (this.el.object3D.visible) {
      ok.play()
    } else {
      ok.pause()
      ok.currentTime = 0
    }
  }
});

AFRAME.registerComponent('btn-mode', {
  schema: {
    mode : {type: 'string', default: 'input'}, input: {type: 'string', default: "1"}
  }
})

AFRAME.registerComponent('scene-switch', {
  schema: {
    name : {type: 'string', default: 'default'}
  },

  init: async function() {
    this.onClick = this.onClick.bind(this)

    this.SceneName = this.data["name"]
    this.el.addEventListener("click", this.onClick)
  },

  onClick: async function() {
    // console.log("area")
    SwitchArea(this.SceneName)
  }
})

AFRAME.registerComponent('scene-changer', {
  schema: {
    name : {type: 'string', default: 'default'},
    angle: {type: 'int', default: 0}
  },

  init: async function() {
    this.onClick = this.onClick.bind(this)
    this.update = this.update.bind(this)

    this.SceneName = this.data["name"]
    this.el.addEventListener("click", this.onClick)
  },

  update: async function() {  
    // console.log("update")
    // ------ \\
    let newData = this.data
    this.SceneName = newData["name"]
    // ------ \\
    let container = $("#navigation")[0]
    let angle = newData["angle"] / (180 / Math.PI), radius = container.getAttribute("radius-outer")
    let x = ( radius ) * Math.cos(angle), z = ( radius ) * Math.sin(angle);
  
    this.el.setAttribute("position", {"x": x, "y": container.getAttribute("position").y, "z": z})
  
    this.el.object3D.lookAt(container.getAttribute("position"))
    this.el.setAttribute("visible", "true")
  },

  onClick: async function() {
    // console.log("area")
    SwitchArea(this.SceneName)
  }
})

AFRAME.registerComponent('scene-init', {
  schema: {type: 'string', default: 'default'},
  init: async function() {
    this.SceneName = this.data
    // console.log(this.SceneName)
    SwitchArea(this.SceneName)
  }
})

AFRAME.registerComponent('redirect', {
  init: function() {
    this.onClick   = this.onClick.bind(this)
    this.redirect  = this.el.getAttribute("redirect") || "index.html"

    this.el.addEventListener('click', this.onClick)
  },
  onClick: async function() {
    var win = $("#cur_camera")[0]
    if(SceneData) { SceneData.empty() };
    if(win) { win.emit("start_trans"); await sleep(500) };
    window.location.href = this.redirect
  }
})

AFRAME.registerComponent("rickbutton", {
  init: function () {
    this.onClick = this.onClick.bind(this)
    this.playing = false
    this.Video = document.querySelector("#rickvideo")
    this.Header = document.querySelector("#RickHeader")
    this.el.addEventListener("click", this.onClick)
  },
  
  onClick: async function() {
    this.playing = !this.playing
    this.Header.setAttribute("visible", this.playing)
      if(this.playing) {
          this.Video.play()
      } else {
          this.Video.pause()
          this.Video.currentTime = 0
      }
  }
  })

AFRAME.registerComponent('infospot', {
  schema: {type: 'string', default: 'default'},
  init: async function() {
    this.onClick   = this.onClick.bind(this)
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);

    this.OldRotation = this.el.rotation

    this.InfoPanel = document.querySelector("#NotifPanel")
    this.InfoDes   = this.InfoPanel.querySelector("#Info_Description")
    this.Info      = this.data || "No Info Provided"

    this.el.addEventListener('mouseenter', this.onMouseEnter);
    this.el.addEventListener('mouseleave', this.onMouseLeave)
    this.el.addEventListener("click", this.onClick)
  },

  onClick: async function() {
    console.log("clicked Info => ", this.Info)
    this.InfoPanel.setAttribute("position", "0 0 -1.5")
    this.InfoPanel.setAttribute("visible", "true")
    this.InfoDes.setAttribute('text', 'value', this.Info)
  },

  onMouseLeave: async function() {
    this.el.emit("start_trans")
    console.log("enter")
  },

  onMouseEnter: async function() {
    this.el.emit("end_trans")
    console.log("leave")
  }
})

AFRAME.registerComponent('spotinfo', {
  init: async function() {
    this.onClick   = this.onClick.bind(this)
    this.InfoDes   = this.el.querySelector("#Info_Description")


    this.el.setAttribute("visible", "false")
    this.el.setAttribute("position", "0 0 20")
    this.el.addEventListener("click", this.onClick)

    $.getJSON("./resources/Notification.json", function( data ) {
      data.forEach(function(Obj) {
        let canuse = false
        let enabled = Obj["Until"] && (Obj["Until"] <= Epoch) || Obj["Enabled"]
        if(!enabled) return;

        if(Obj["Only"]) {
          if(typeof(Obj["Only"]) == "string") {
            if(Obj["Only"] == PathName.toLowerCase()) canuse = true;
          } else {
            Obj["Only"].forEach(function(asset) {
              if(asset == PathName.toLowerCase()) canuse = true;
            })
          }
        } else { canuse = true }

        if(!canuse) return;

        console.log("showing notification")

        this.el.setAttribute("position", "0 0 -1.5")
        this.el.setAttribute("visible", "true")
        this.InfoDes.setAttribute('text', 'value', Obj["Content"])

      }, this)
    }.bind(this), this);
  },

  onClick: async function() {
    this.el.setAttribute("visible", "false")
    this.el.setAttribute("position", "0 0 20")
  }
})

AFRAME.registerComponent('pc', {
  init: async function() {
    this.onClick   = this.onClick.bind(this)

    this.Enabled = true
    this.screen = this.el.querySelector("#SCREEN")
    this.light  =  this.el.querySelector("#LIGHT")

    this.el.addEventListener("click", this.onClick)

    this.onClick()
  },

  onClick: async function() {
    this.Enabled = !this.Enabled
    if (this.Enabled) this.screen.emit("womp")
    this.screen.setAttribute("material", "src", "./resources/images/PC_" + (this.Enabled && "ON" || "OFF") + ".png")
    this.light.setAttribute("visible", this.Enabled && "true" || "false")
  }
})

AFRAME.registerComponent('polaro', {
  schema: {default: ''},

  init: async function() {
    this.onClick   = this.onClick.bind(this)
    this.Asset = document.querySelector(this.data)

    this.LastParent = this.el.object3D.parent
    this.OldPos = AFRAME.utils.coordinates.stringify(this.el.getAttribute("position"))
    this.OldRot = AFRAME.utils.coordinates.stringify(this.el.getAttribute("rotation"))
  console.log(this.OldPos)

    this.Click = -1
    this.el.addEventListener("click", this.onClick)
  },

  onClick: async function(evt) {
    this.Click += 1
    let Target = evt.currentTarget

    if(this.Click == 0) {
      switch (IsVR) {
        case true:
          Used.object3D.attach(this.el.object3D)

          this.el.setAttribute("position", "0 -.1 -.2")
          this.el.setAttribute("rotation", "0 180 0")
          break
        case false:
          $("#cur_camera")[0].object3D.attach(this.el.object3D)

          this.el.setAttribute("position", "18.106 -0.888 -0.752")
          this.el.setAttribute("rotation", "0 6.001 0")
          break
      }
    }

    if(this.Click == 1) {
        this.Asset.play()
    }

    if (this.Click == 2) {
      this.Click = -1

        this.LastParent.attach(this.el.object3D)
        this.el.setAttribute("position", this.OldPos)
        this.el.setAttribute("rotation", this.OldRot)

        this.Asset.pause()
        this.Asset.currentTime = 0
    }
  }
})

AFRAME.registerComponent('volant', {
  schema: {default: ''},

  init: async function() {
    this.onClick   = this.onClick.bind(this)
    this.Asset = document.querySelector(this.data)

    this.LastParent = this.el.object3D.parent
    this.OldPos = AFRAME.utils.coordinates.stringify(this.el.getAttribute("position"))
    this.OldRot = AFRAME.utils.coordinates.stringify(this.el.getAttribute("rotation"))
    this.OldSca = AFRAME.utils.coordinates.stringify(this.el.getAttribute("scale"))
  console.log(this.OldPos)

    this.Click = -1
    this.el.addEventListener("click", this.onClick)
  },

  onClick: async function(evt) {
    this.Click += 1
    let Target = evt.currentTarget

    if(this.Click == 0) {
      switch (IsVR) {
        case true:
          Used.object3D.attach(this.el.object3D)
              
          this.el.setAttribute("position", "0 0 0")
          this.el.setAttribute("rotation", "-48.20981479789773 -48.04480295290005 -38.046689427867186")
          this.el.setAttribute("scale", "10 10 10")

          break
        case false:
          $("#cur_camera")[0].object3D.attach(this.el.object3D)

          this.el.setAttribute("position", "1.91777 -0.28105 -1.39562")
          this.el.setAttribute("rotation", "-48.20981479789773 -48.04480295290005 -38.046689427867186")
          this.el.setAttribute("scale", "10 10 10")
          break
      }
    }

    if(this.Click == 1) {
        this.Asset.play()
    }

    if (this.Click == 2) {
      this.Click = -1

        this.LastParent.attach(this.el.object3D)
        this.el.setAttribute("position", this.OldPos)
        this.el.setAttribute("rotation", this.OldRot)
        this.el.setAttribute("scale", this.OldSca)
        this.Asset.pause()
        this.Asset.currentTime = 0
    }
  }
})



AFRAME.registerComponent('phone', {
  schema: {default: ''},

  init: async function() {
    this.onClick   = this.onClick.bind(this)
    this.Asset = document.querySelector(this.data)

    this.LastParent = this.el.object3D.parent
    this.OldPos = AFRAME.utils.coordinates.stringify(this.el.getAttribute("position"))
    this.OldRot = AFRAME.utils.coordinates.stringify(this.el.getAttribute("rotation"))
  console.log(this.OldPos)

    this.Click = -1
    this.el.addEventListener("click", this.onClick)
  },

  onClick: async function(evt) {
    this.Click += 1
    let Target = evt.currentTarget

    if(this.Click == 0) {
      switch (IsVR) {
        case true:
          Used.object3D.attach(this.el.object3D)

          this.el.setAttribute("position", "0 -.1 -.2")
          this.el.setAttribute("rotation", "0 180 0")
          break
        case false:
          $("#cur_camera")[0].object3D.attach(this.el.object3D)

          this.el.setAttribute("position", "0 -.02 -.3")
          this.el.setAttribute("rotation", "-90 180 0")
          break
      }
    }

    if(this.Click == 1) {
        this.Asset.play()
    }

    if (this.Click == 2) {
      this.Click = -1

        this.LastParent.attach(this.el.object3D)
        this.el.setAttribute("position", this.OldPos)
        this.el.setAttribute("rotation", this.OldRot)

        this.Asset.pause()
        this.Asset.currentTime = 0
    }
  }
})

// PROJECTOR \\

AFRAME.registerComponent('projector', {
  init: function() {
    this.onClick = this.onClick.bind(this)
    this.cooldown = false
    this.enabled = true

    this.projector = document.querySelector(this.el.getAttribute("projector"))
    this.light = this.projector.querySelector("#light")
    this.source = this.projector.querySelector("#source")

    this.cover = this.el.querySelector("#cover")
    this.asset = this.el.querySelector("#asset")
    this.sound = this.projector.querySelector("#sound")

    if(!this.cover || !this.asset) { console.log("end"); alert("No cover/asset Found"); return }

    this.FileList  = (this.el.getAttribute("images") || "").split(", ")
    this.Directory = this.el.getAttribute("folder") || "./"
    this.Current = 0

    this.projector.addEventListener('click', this.onClick)
    this.projector.addEventListener('newimage', this.switchPage)
  },

  onClick: async function() {
    if(this.cooldown) { return; }
    this.cooldown = true
    // console.log("play")
    this.sound.components.sound.playSound();
    this.switchPage()
    await sleep(1000)
    this.cooldown = false
  },

  switchPage: async function() {
    this.cover.emit("hide")
    this.light.setAttribute("visible", "false")
    this.source.setAttribute("visible", "false")
    if(this.Current == this.FileList.length) { this.Current = 0 }
    await sleep(500)
    this.asset.setAttribute('material', 'src', this.Directory + "/" + this.FileList[this.Current])
    this.Current += 1
    await sleep(500)
    this.light.setAttribute("visible", "true") 
    this.source.setAttribute("visible", "true") 
    this.cover.emit("show")
  }
})

AFRAME.registerComponent('modelfix', {
  init: function() {
    this.el.addEventListener('model-loaded', function(evt) {
      var model = evt.detail.model;
      traverse(model);
  });
  }
})

AFRAME.registerComponent('collider-check', {
  dependencies: ['raycaster'],

  init: function () {
    this.OldCall = undefined

    this.el.addEventListener('raycaster-intersection', function (e) {
      this.OldCall = e.detail.els
      console.log(this.OldCall)
      e.detail.els.forEach(function(el) {
        el.emit("detect")
      })
      console.log('Player enter collision !');

    });
  }
});

// Audio

AFRAME.registerComponent('audiohandler', {
  init: async function() {
    this.onClick = this.onClick.bind(this)
    this.playing = false

    this.el.addEventListener('click', this.onClick);
  },

  onClick: async function() {
    this.playing = !this.playing
    if(this.playing) {
      this.el.components.sound.playSound()
    } else {
      this.el.components.sound.stopSound()
    }
  }
})

if(scene) {
  scene.addEventListener("enter-vr", function() {
    IsVR = true
    OnVRChange()
  })

  scene.addEventListener("exit-vr", function() {
    IsVR = false
    OnVRChange()
  })

  scene.addEventListener("loaded", function() {
    OnVRChange()
  })
}

// This code is toooooo long
// oh my god
// 1K LINES BOYS WOOOOOOOOO

// ░░░░░▄▄▄▄▀▀▀▀▀▀▀▀▄▄▄▄▄▄░░░░░░░
// ░░░░░█░░░░▒▒▒▒▒▒▒▒▒▒▒▒░░▀▀▄░░░░
// ░░░░█░░░▒▒▒▒▒▒░░░░░░░░▒▒▒░░█░░░
// ░░░█░░░░░░▄██▀▄▄░░░░░▄▄▄░░░░█░░
// ░▄▀▒▄▄▄▒░█▀▀▀▀▄▄█░░░██▄▄█░░░░█░
// █░▒█▒▄░▀▄▄▄▀░░░░░░░░█░░░▒▒▒▒▒░█
// █░▒█░█▀▄▄░░░░░█▀░░░░▀▄░░▄▀▀▀▄▒█
// ░█░▀▄░█▄░█▀▄▄░▀░▀▀░▄▄▀░░░░█░░█░
// ░░█░░░▀▄▀█▄▄░█▀▀▀▄▄▄▄▀▀█▀██░█░░
// ░░░█░░░░██░░▀█▄▄▄█▄▄█▄████░█░░░
// ░░░░█░░░░▀▀▄░█░░░█░█▀██████░█░░
// ░░░░░▀▄░░░░░▀▀▄▄▄█▄█▄█▄█▄▀░░█░░
// ░░░░░░░▀▄▄░▒▒▒▒░░░░░░░░░░▒░░░█░
// ░░░░░░░░░░▀▀▄▄░▒▒▒▒▒▒▒▒▒▒░░░░█░
// ░░░░░░░░░░░░░░▀▄▄▄▄▄░░░░░░░░█░░ 

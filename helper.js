class GMapsHelper {
	init() {
		this.tileSize = 256;
		this.markers = [];
		this.$searchAddress = document.getElementById('search-address');
		
		const initialCoords = {tlx: 1.4797439626464648, tly: 42.53285228734072, brx: 1.563858037353496, bry: 42.479701573326};
		
		const centerPoint = new google.maps.LatLng((initialCoords.tly + initialCoords.bry) / 2, (initialCoords.tlx + initialCoords.brx) / 2);
	    const mapOptions = 
	    {
	        center: centerPoint,
	        zoom: 9,
	        zoomControl: true,
	        zoomControlOptions: {
	            style: google.maps.ZoomControlStyle.DEFAULT,
	        },
	        mapTypeControl: true,
	        panControl: false,
	        scaleControl: true,
	        scrollwheel: true,
	        streetViewControl: false,
	        draggable : true,
	        overviewMapControl: false,
	        mapTypeId: google.maps.MapTypeId.HYBRID
	    };
	
	    const bounds = new google.maps.LatLngBounds(
	        new google.maps.LatLng(initialCoords.bry, initialCoords.tlx),
	        new google.maps.LatLng(initialCoords.tly, initialCoords.brx)
	    );

	    this.autocomplete = new google.maps.places.Autocomplete(
	        (this.$searchAddress),
	        {types: ['geocode']});
	
	    this.tilelayer = new google.maps.ImageMapType({
	        getTileUrl: function(tile, zoom) { return "images/grid.png"; },
	        tileSize: new google.maps.Size(256, 256)
	    });
	
	    this.geocoder = new google.maps.Geocoder();
	    this.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
	    
	    if (document.getElementById('show-grid').checked) {
	    	this.map.overlayMapTypes.insertAt(0, tilelayer);
	    } else {
	    	this.map.fitBounds(bounds);
	    }
	
	    this.rectangle = new google.maps.Rectangle({
	        bounds: bounds,
	        editable: true
	    });
	    this.rectangle.setMap(this.map);
	    this.rectangle.addListener("bounds_changed", () => { this.updateInfo(); });
	
	    this.bestResultRect = new google.maps.Rectangle({
	        bounds: bounds,
	        strokeColor: '#00FF00',
	        strokeOpacity: 0.8,
	        strokeWeight: 2,
	        visible: false
	    });
	    this.bestResultRect.setMap(this.map);
	    
	    if (document.getElementById('best-rect').checked) {
	        bestResultRect.setVisible(true);
	        document.getElementById('select-best-rect-button').style.display = 'block';
	    }
	    
	    this.updateBestRect();
	    this.updateInfo();
		this.setupListeners();
	}
	
	setupListeners () {
		this.$searchAddress.addEventListener("keyup", (event) => {
			if(event.keyCode == 13) {
				document.getElementById('search-button').click();
			}
		});
		
		document.getElementById('create-selector-button').addEventListener("click", () => { this.showRectangle(); });
	    document.getElementById('search-button').addEventListener("click", () => { this.search(); });
	    document.getElementById('open-osm-button').addEventListener("click", () => { this.showOnOSM(); });
	    document.getElementById('select-best-rect-button').addEventListener("click", () => { this.selectBestRect(); });
	    document.getElementById('show-grid').addEventListener("change", () => { this.toggleGrid(); });
	    document.getElementById('best-rect').addEventListener("change", () => { this.toggleBestRect(); });
	    
	    document.body.addEventListener("keydown", (event) => {
	    	if (event.ctrlKey == 1) {
		        this.rectangle.setDraggable(true);
		        for(let i = 0; i < this.markers.length; i++) this.markers[i].setDraggable(true);
		    }
	    });
	    document.body.addEventListener("keyup", (event) => {
	    	if (event.ctrlKey == 0) {
		        this.rectangle.setDraggable(false);
		        for(let i = 0; i < this.markers.length; i++) this.markers[i].setDraggable(false);
		    }
	    });
	    
	    // arrows listener
	    document.querySelectorAll('#move-selector img').forEach(el => {
	    	el.addEventListener("click", (e) => { this.moveSelector(e.target.alt.toLowerCase()); });
	    });
	}
	
	toggleGrid () {
		if (document.getElementById('show-grid').checked) {
			this.map.overlayMapTypes.insertAt(0, this.tilelayer);
		} else {
			this.map.overlayMapTypes.removeAt(0);
		}
	}
	
	toggleBestRect () {
		const show = document.getElementById('best-rect').checked;
		
		this.bestResultRect.setVisible(show);
		document.getElementById('select-best-rect-button').style.display = show ? 'block' : 'none';
	}
	
	selectBestRect () {
		this.rectangle.setBounds(this.bestResultRect.getBounds());
	}
	
	moveSelector (direction) {
		const bounds = this.rectangle.getBounds();
	    const ne = bounds.getNorthEast();
	    const sw = bounds.getSouthWest();
	    
	    let off;
	    let sw2;
	    let ne2;
	    
	    switch (direction) {
	    	case "up":
	    		off = ne.lat() - sw.lat();
			
			    ne2 = new google.maps.LatLng(ne.lat() + off, ne.lng());
			    sw2 = new google.maps.LatLng(sw.lat() + off, sw.lng());
	    		break;
    		case "left":
	    		off = ne.lng() - sw.lng();
			
			    ne2 = new google.maps.LatLng(ne.lat(), ne.lng() - off);
			    sw2 = new google.maps.LatLng(sw.lat(), sw.lng() - off);
    			break;
    		case "right":
    			off = ne.lng() - sw.lng();
			
			    ne2 = new google.maps.LatLng(ne.lat(), ne.lng() + off);
			    sw2 = new google.maps.LatLng(sw.lat(), sw.lng() + off);
    			break;
    		case "down":
	    		off = ne.lat() - sw.lat();
			
			    ne2 = new google.maps.LatLng(ne.lat() - off, ne.lng());
			    sw2 = new google.maps.LatLng(sw.lat() - off, sw.lng());
    			break;
	    }
	    
	    this.rectangle.setBounds(new google.maps.LatLngBounds(sw2, ne2));
	}
	
	search () {
		this.geocoder.geocode({'address': this.$searchAddress.value}, (results, status) => { 
	            if (status == google.maps.GeocoderStatus.OK) { 
	                const loc = results[0].geometry.location;
	                this.map.panTo(loc);
	            } else {
	                alert("Not found: " + status); 
	            } 
	        }
	    );
	}
	
	showOnOSM () {
		const center = this.map.getCenter();
	    const win = window.open("http://www.openstreetmap.org/#map=" + this.map.getZoom() + "/" + center.lat() + "/" + center.lng(), '_blank');
	    win.focus();
	}
	
	showRectangle() {
	    const center = this.map.getCenter();
	    const bounds = this.map.getBounds();
	    const bne = bounds.getNorthEast();
	    const bsw = bounds.getSouthWest();
	    const x1 = this.repeat(bsw.lng(), -180, 180);
	    const y1 = this.repeat(bne.lat(), -90, 90);
	    const x2 = this.repeat(bne.lng(), -180, 180);
	    const y2 = this.repeat(bsw.lat(), -90, 90);
	    const cx = this.repeat(center.lng(), -180, 180);
	    const cy = this.repeat(center.lat(), -90, 90);
	    const ne = new google.maps.LatLng(cy + (y1 - cy) * 0.7, cx + (cx - x1) * 0.7);
	    const sw = new google.maps.LatLng(cy + (y2 - cy) * 0.7, cx + (cx - x2) * 0.7);
	    
	    this.rectangle.setBounds(new google.maps.LatLngBounds(sw, ne));
	}
	
	updateBestRect() {
	    const zoom = this.map.zoom + 3;
	
	    const bounds = this.bestResultRect.getBounds();
	
	    let ne = this.latLngToTile(bounds.getNorthEast(), zoom);
	    let sw = this.latLngToTile(bounds.getSouthWest(), zoom);
	    ne.x = Math.round(ne.x);
	    ne.y = Math.round(ne.y);
	    sw.x = Math.round(sw.x);
	    sw.y = Math.round(sw.y);
	
	    ne = this.tileToLatLng(ne, zoom);
	    sw = this.tileToLatLng(sw, zoom);
	
	    this.bestResultRect.setBounds(new google.maps.LatLngBounds(sw, ne));
	}
	
	latLngToTile(latLng, zoom) {
	    const sy = Math.sin(latLng.lat() * Math.PI / 180);
	    const lng = (latLng.lng() + 180) / 360;
	    const lat = 0.5 - Math.log((1 + sy) / (1 - sy)) / (Math.PI * 4);
	    const mapSize = this.tileSize * (1 << zoom);
	    
	    let px = lng * mapSize + 0.5;
	    let py = lat * mapSize + 0.5;
	
	    if (px < 0) px = 0;
	    else if (px > mapSize - 1) px = mapSize - 1;
	    if (py < 0) py = 0;
	    else if (py > mapSize - 1) py = mapSize - 1;
	
	    const tx = px / this.tileSize;
	    const ty = py / this.tileSize;
	
	    return new google.maps.Point(tx, ty);
	}
	
	tileToLatLng(tilePos, zoom) {
	    const mapSize = this.tileSize << zoom;
	    const lng = 360 * (this.repeat(tilePos.x * this.tileSize, 0, mapSize - 1) / mapSize - 0.5);
	    const lat = 90 - 360 * Math.atan(Math.exp((this.clip(tilePos.y * this.tileSize, 0, mapSize - 1) / mapSize - 0.5) * Math.PI * 2)) / Math.PI;
	    return new google.maps.LatLng(lat, lng);
	}
	
	repeat(value, minValue, maxValue) {
	    const range = maxValue - minValue;
	    while (value < minValue || value > maxValue) {
	        if (value < minValue) value += range;
	        else value -= range;
	    }
	    return value;
	}
	
	clip(val, min, max) {
	    if (val < min) {
	    	return min;
	    }
	    if (val > max) {
	    	return max
	    }
	    return val;
	}
	    		
	updateInfo() {
	    const bounds = this.rectangle.getBounds();
	    const ne = bounds.getNorthEast();
	    const sw = bounds.getSouthWest();
	    
	    document.getElementById('coords-top-lat').innerText = ne.lat();
	    document.getElementById('coords-top-long').innerText = sw.lng();
	    document.getElementById('coords-bottom-lat').innerText = sw.lat();
	    document.getElementById('coords-bottom-long').innerText = ne.lng();
	
	    const D2R = Math.PI / 180.0;
	    const R = 6371;
	
	    const scfY = Math.sin(ne.lat() * D2R);
	    const sctY = Math.sin(sw.lat() * D2R);
	    const ccfY = Math.cos(ne.lat() * D2R);
	    const cctY = Math.cos(sw.lat() * D2R);
	    const cX = Math.cos((sw.lng() - ne.lng()) * D2R);
	    const sizeX1 = Math.abs(R * Math.acos(scfY * scfY + ccfY * ccfY * cX));
	    const sizeX2 = Math.abs(R * Math.acos(sctY * sctY + cctY * cctY * cX));
	    const sizeX = ((sizeX1 + sizeX2) / 2.0);
	    const sizeY = (R * Math.acos(scfY * sctY + ccfY * cctY));
	
		document.getElementById('area-width').innerText = sizeX.toFixed(2);
		document.getElementById('area-height').innerText = sizeY.toFixed(2);
		document.getElementById('area-area').innerText = (sizeX * sizeY).toFixed(2);
	
	    this.bestResultRect.bounds = this.rectangle.getBounds();
	    this.updateBestRect();
	
		// reset wrong warnings
		document.querySelectorAll('div.wrong').forEach(el => {
			el.classList.remove("wrong");
		});

	    let wrong = false;
	    
	    if (ne.lat() > 60 || ne.lat() < -60) { 
	    	document.getElementById('top-lat-row').classList.add("wrong");
        	wrong = true;
        }
        if (sw.lat() > 60 || sw.lat() < -60) { 
        	document.getElementById('bottom-lat-row').classList.add("wrong");
        	wrong = true;
        }
	
	    if (wrong) {
	    	document.getElementById('coordinates').innerText = "Wrong latitude";
	    	return;   
	    }
	    
	    document.getElementById('coordinates').innerText = sw.lng() + ' ' + ne.lat() + ' ' + ne.lng() + ' ' + sw.lat();
	}
}
//= require jquery.simulate

OSM.Search = function(map) {
  $(".search_form input[name=query]")
    .on("input", function(e) {
      if ($(e.target).val() === "") {
        $(".describe_location").fadeIn(100);
      } else {
        $(".describe_location").fadeOut(100);
      }
    });

  $("#sidebar_content")
    .on("click", ".search_more a", clickSearchMore)
    .on("click", ".search_results_entry a.set_position", clickSearchResult)
    .on("mouseenter", "p.search_results_entry:has(a.set_position)", showSearchResult)
    .on("mouseleave", "p.search_results_entry:has(a.set_position)", hideSearchResult)
    .on("mousedown", "p.search_results_entry:has(a.set_position)", function() {
      var moved = false;
      $(this).one("click", function (e) {
        if (!moved && !$(e.target).is('a')) {
          $(this).find("a.set_position").simulate("click", e);
        }
      }).one("mousemove", function () {
        moved = true;
      });
    });

  function clickSearchMore(e) {
    e.preventDefault();
    e.stopPropagation();

    var div = $(this).parents(".search_more");

    $(this).hide();
    div.find(".loader").show();

    $.get($(this).attr("href"), function(data) {
      div.replaceWith(data);
    });
  }

  function showSearchResult(e) {
    var $parentElt = $(this).closest("li");
    var $currentSelectedElt = $(e.target).closest('li').siblings('.selected');
    var marker = $(this).data("marker");

    // Remove the marker from the map if already displayed 
    if ($currentSelectedElt && $currentSelectedElt.length > 0) {
      hideSearchResult.call($currentSelectedElt);
    }

    if (!marker) {
      var data = $(this).find("a.set_position").data();

      marker = L.marker([data.lat, data.lon], {icon: getUserIcon()});

      $(this).data("marker", marker);
    }

    markers.addLayer(marker);
    $parentElt.addClass("selected");
  }

  function showFirstSearchResult($html) {
    if ($html && $html.length > 0)
    {
      var $firstResultElt = $("p.search_results_entry:has(a.set_position)", $html).first();
      var data = $('a.set_position', $firstResultElt).data();
      var center = L.latLng(data.lat, data.lon);
      var marker = data.marker || L.marker([data.lat, data.lon], {icon: getUserIcon()});

      // Add a marker on the map that points 
      // to the suggested location.
      $firstResultElt.data("marker", marker);
      markers.addLayer(marker);

      // Refresh the map view
      if (data.minLon && data.minLat && data.maxLon && data.maxLat) {
        map.fitBounds([[data.minLat, data.minLon], [data.maxLat, data.maxLon]]);
      } else {
        map.setView(center, data.zoom);
      }

      $firstResultElt.closest("li").addClass("selected");
    }
  }

  function hideSearchResult(e) {
    var marker = $(this).data("marker");

    if (marker) {
      markers.removeLayer(marker);
    }

    $(this).closest("li").removeClass("selected");
  }

  function clickSearchResult(e) {
    var data = $(this).data(),
      center = L.latLng(data.lat, data.lon);

    if (data.minLon && data.minLat && data.maxLon && data.maxLat) {
      map.fitBounds([[data.minLat, data.minLon], [data.maxLat, data.maxLon]]);
    } else {
      map.setView(center, data.zoom);
    }

    // Let clicks to object browser links propagate.
    if (data.type && data.id) return;

    e.preventDefault();
    e.stopPropagation();
  }

  var markers = L.layerGroup().addTo(map);

  var page = {};

  var displayFirstResultOnMap = false;

  page.pushstate = page.popstate = function(path) {
    path = path && decodeURIComponent(path);
    var params = querystring.parse(path.substring(path.indexOf('?') + 1));
    $(".search_form input[name=query]").val(params.query);
    $(".search_form input[name=query]").typeahead('val', params.query);
    displayFirstResultOnMap = parseInt(params.suggest, 10) ? true : false;
    OSM.loadSidebarContent(path, page.load);
  };

  page.load = function() {
    $(".search_results_entry").each(function() {
      var entry = $(this);
      $.ajax({
        url: entry.data("href"),
        method: 'GET',
        data: {
          zoom: map.getZoom(),
          minlon: map.getBounds().getWest(),
          minlat: map.getBounds().getSouth(),
          maxlon: map.getBounds().getEast(),
          maxlat: map.getBounds().getNorth()
        },
        success: function(html) {
          entry.html(html);
          if (displayFirstResultOnMap)
            showFirstSearchResult(entry.html);
        }
      });
    });

    return map.getState();
  };

  page.unload = function() {
    markers.clearLayers();
    $(".search_form input[name=query]").typeahead('val', '');
    $(".describe_location").fadeIn(100);
  };

  return page;
};

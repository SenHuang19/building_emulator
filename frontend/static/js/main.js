var globalBuildingTypes, 
    globalBuildingMap, 
    globalDefaultAppList, 
    globalParametersList,
    globalUUID,
    c_indx, fileObj;
var sysVariables = { max_nzones: 0 };

//------------------------------------ for index page ----------------------------------- //
// show a list of data streams for a selected appliance
function showStreams(streamInfo, streamList) {

    // show modal and remove previous content 
    $('#streamList').modal('show');
    d3.select("#mdlbdy-stream-list").selectAll("*").remove();
    
    // add a table for the new list
    var streamTable = d3.select("#mdlbdy-stream-list").append('table')
                            .attr('class', 'table table-sm table-bordered stream-table')
    
    var streamBody = streamTable.append('tbody')
    
    // for each stream
    var i = 0;
    streamList.forEach(function(d){
        streamRow = streamBody.append('tr').attr('id', 'sr' + i.toString());
        
        // data label
        streamRow.append('td')
                    .attr('style', 'text-align:left;')
                    .text(d.label)
        
        // to link it to a data stream
        streamRow.append('td')
                .append('img')
                    .attr('class', 'row-simage')
                    .attr('src', 'static/icons/link.png');
        streamRow.append('td')
                .text(d.stream);

        // to get data from the file
        streamRow.append('td')
                .append('img')
                    .attr('class', 'row-simage')
                    .attr('src', 'static/icons/upload.png');
        streamRow.append('td')
                .text(d.filename);

        // to delete a particular data stream
        streamRow.append('td')
                .append('img')
                    .attr('class', 'row-simage')
                    .attr('id', streamInfo + '_' + i.toString())
                    .attr('style', 'cursor:pointer;')
                    .attr('src', 'static/icons/cancel.png')
                .on('click', function() {
                    // on delete, update the global building map
                    var tag_list = this.id.split('_');
                    if (tag_list.length == 5) {
                        jQuery("#sr" + tag_list[4].toString()).remove();
                        delete globalBuildingMap["building"]["floors"][tag_list[0]]["zones"][tag_list[1]][tag_list[2]][tag_list[4]]
                    } else if (tag_list.length == 4) {
                        jQuery("#sr" + tag_list[3].toString()).remove();
                        delete globalBuildingMap["building"]["floors"][tag_list[0]]["appliances"][tag_list[1]][tag_list[3]]
                    } else if (tag_list.length == 3) {
                        jQuery("#sr" + tag_list[2].toString()).remove();
                        delete globalBuildingMap["building"]["appliances"][tag_list[0]][tag_list[2]]
                    }
                });
        i = i + 1;
    });
}

// print a list of appliances present in building/floor/zone
function printApplianceList(iType, id) {
    var label = "";
    var cross_tag = "";
    var appliances = [];
    
    // get a list of appliances for building, floor, and zone
    if (iType == "building") {
        label = "Building Loads";
        cross_tag = "_"
        appliances = globalBuildingMap["building"]["appliances"];
    } else if (iType == "floor") {
        label = "Floor-" + id.split('F')[1].toString() + " Loads"
        cross_tag = "F" + id.split('F')[1].toString() + "_"
        appliances = globalBuildingMap["building"]["floors"][id]["appliances"];
    } else if (iType == "zone") {
        label = "Floor-" + id.split('_')[0].split('F')[1].toString() + " Zone-" + id.split('_')[1].split('Z')[1].toString() + " Loads";
        cross_tag = "F" +  + id.split('_')[0].split('F')[1].toString() + "_Z" + id.split('_')[1].split('Z')[1].toString() + "_"
        appliances = globalBuildingMap["building"]["floors"][id.split('_')[0]]["zones"][id.split('_')[1]];
    }
    
    // clear the previous appliance list
    var applianceDiv = d3.select(".list-of-appliances");
    applianceDiv.selectAll("*").remove();
    
    // add a new appliance list
    var applianceTable = applianceDiv.append('table')
                            .attr('class', 'table table-sm table-bordered appliance-table')
                            .attr('id', 'appliance-table')
    
    // appliance list heading
    var tableHead = applianceTable.append('thead').append('tr').append('th')
            .attr('scope', 'col')
            .attr('colspan', 2)
            .text(label);
    
    var tableBody = applianceTable.append('tbody')
    
    // add all the appliances
    for (var i=0; i<Object.keys(appliances).length; i++) {
        var appliance = Object.keys(appliances)[i];
        var app_cross_tag = cross_tag + appliance + '_' + i.toString();
        
        var tableRow = tableBody.append('tr').attr('id', 'r' + i.toString());
        
        // clickable link for each appliance
        tableRow.append('td')
                    .attr('style', 'text-align:left;')
                    .attr('class', 'clickable-link')
                .append('a')
                    .attr('href', 'javascript:void(0);')
                    .text(appliance)
                .on('click', function(data) {
                    // for each appliance, show a list of data streams available
                    showStreams(app_cross_tag, appliances[appliance]);
                });

        // for each appliance, add a cancel image to delete that appliance
        tableRow.append('td')
                .append('img')
                    .attr('class', 'row-simage')
                    .attr('id', app_cross_tag)
                    .attr('src', 'static/icons/cancel.png')
                    .attr('style', 'cursor:pointer;')
                .on('click', function(){
                    // on delete, update the building map
                    var tag_list = this.id.split('_');
                    if (tag_list.length == 4) {
                        jQuery("#r" + tag_list[3].toString()).remove();
                        delete globalBuildingMap["building"]["floors"][tag_list[0]]["zones"][tag_list[1]][tag_list[2]]
                    } else if (tag_list.length == 3) {
                        jQuery("#r" + tag_list[2].toString()).remove();
                        delete globalBuildingMap["building"]["floors"][tag_list[0]]["appliances"][tag_list[1]]
                    } else if (tag_list.length == 2) {
                        jQuery("#r" + tag_list[1].toString()).remove();
                        delete globalBuildingMap["building"]["appliances"][tag_list[0]]
                    }
                });
    }
}

// print summary table in the right most panel
function generateTable() {

    // select building box and append table
    var buildingModel = d3.select('.building-box');
    
    buildingModel.selectAll('*').remove();
    buildingTable = buildingModel.append('table')
                        .attr('class', 'table table-sm table-bordered building-model')
    
    var tableBody = buildingTable.append('tbody');
    
    // add floors and zones
    var nfloors = Object.keys(globalBuildingMap["building"]["floors"]).length;
    for (var i=nfloors-1; i>=0; i--) {
        floorRow = tableBody.append('tr').attr('class', 'F' + (i+1).toString() + '_row')
        nzones = Object.keys(globalBuildingMap["building"]["floors"]['F' + (i+1).toString()]["zones"]).length;
        
        var nzoneArraylen = nzones * Math.ceil(sysVariables['max_nzones'] % nzones);
        
        nzoneArray = new Array(nzones).fill(0);
        for (var j=0; j<sysVariables['max_nzones']; j++) {
            nzoneArray[j%nzones] = nzoneArray[j%nzones] + 1;
        }
        
        // add a clickable link to get the list of appliances for each zone
        for (var j=0; j<nzones; j++) {
            floorRow.append('td')
                        .attr('colspan', nzoneArray[j])
                        .attr('class', 'zone-block clickable-link')
                    .append('a')
                        .attr('href', 'javascript:void(0);')
                        .attr('id', 'F' + (i+1).toString() + '_Z' + (j+1).toString())
                        .text('Z' + (j+1).toString())
                    .on('click', function(data) {
                        // print list of appliances for the selected zone
                        printApplianceList('zone', this.id);
                    });
        }
        
        // add a clickable link to get the list of appliances for each floor
        floorRow.append('td')
                    .attr('class', 'floor-block clickable-link')
                .append('a')
                    .attr('href', 'javascript:void(0);')
                    .attr('id', 'F' + (i+1).toString())
                    .text('F' + (i+1).toString())
                .on('click', function(data) {
                    // print list of appliances for the selected floor
                    printApplianceList('floor', this.id);
                });
    }
    
    // add a clickable link to get the list of common appliances for the building
    tableBody.append('tr').append('td')
            .attr('scope', 'col')
            .attr('colspan', sysVariables['max_nzones'])
            .attr('class', 'building-block clickable-link')
        .append('a')
            .attr('href', 'javascript:void(0);')
            .attr('id', 'B0')
            .text("Building Loads")
        .on('click', function(data) {
            // print list of appliances for the building
            printApplianceList('building', this.id);
        });
}

// print summary panel
function addFloor(f_no, nZones=1) {

    // select floor panel and compare number of floors with stored system variables
    var floorPanel = d3.select('.floor-list');

    var currentNZones = nZones;
    if (currentNZones > sysVariables['max_nzones']) { sysVariables['max_nzones'] = currentNZones; }
    
    var floorID = f_no;
           
    // append floors 
    var panel = floorPanel
                    .append('div')
                        .attr('class', 'col-sm-3 floor-div f' + (f_no+1).toString())
    
    panel
        .append('label')
            .text('F' + (f_no+1).toString())
            .attr('class', 'col-sm-12')

    panel
        .append('div')
            .attr('class', 'col-sm-12 floor-input')
        .append('input')
            .attr('id', 'f' + (f_no+1).toString() + 'zones')
            .attr('name', 'nzones')
            .attr('class', 'form-control floor-input')
            .attr('type', 'text')
            .attr('value', currentNZones)
            .attr('style', 'text-align:center;')
        .on('change', function() {

            // update global building map
            var floorID = 'F' + this.id.split('zones')[0].split('f')[1];
            
            // previous number of floors
            var currentNZones = $("." + floorID + "_row" + " > td").length-1
            var updatedNZones = parseInt(jQuery('#' + this.id).val());

            if (updatedNZones > sysVariables['max_nzones']) { sysVariables['max_nzones'] = updatedNZones; }
            if (updatedNZones > currentNZones) {
                for (var i=currentNZones; i<updatedNZones; i++) {
                    globalBuildingMap["building"]["floors"][floorID]["zones"]['Z' + (i+1).toString()] = globalDefaultAppList;
                }
            } 
            else if (updatedNZones < currentNZones) {
                // remove floors from the end
                for (var i=currentNZones; i>updatedNZones; i--) {
                    delete globalBuildingMap["building"]["floors"][floorID]["zones"]['Z' + (i).toString()];
                }
            }

            // update summary table
            generateTable();
        });
}

// update number of floors and number of zones at each floor when number of floors get updated
function update_zones() {
    var floorPanel = d3.select('.floor-list');

    // previous number of floors
    var currentNFloors = $(".floor-list > div").length
    
    // update number of floors
    var updatedNFloors = jQuery('#nfloors').val();
    
    // if now the number of floors is more
    if (updatedNFloors > currentNFloors) {
        
        // add new floors in the building
        for (var i=currentNFloors; i<updatedNFloors; i++) {
            
            // add new floor
            addFloor(i);
            
            // update building configuration json
            globalBuildingMap["building"]["floors"]['F' + (i+1).toString()] = {};
            globalBuildingMap["building"]["floors"]['F' + (i+1).toString()]["appliances"] = globalDefaultAppList;
            globalBuildingMap["building"]["floors"]['F' + (i+1).toString()]["zones"] = {"Z1": globalDefaultAppList};
        }
    } // if now the number of floors is less
    else if (updatedNFloors < currentNFloors) {
        // remove floors from the end
        for (var i=currentNFloors; i>updatedNFloors; i--) {
            
            // remove floor
            d3.select('.f' + i.toString()).remove();
            
            // update json
            delete globalBuildingMap["building"]["floors"]['F' + (i).toString()];
        }
        
        // update max_nzones
        sysVariables['max_nzones'] = 0
        for (var i=0; i<nfloors; i++) {
            
            var nZones = Object.keys(globalBuildingMap["building"]["floors"]['F' + (i+1).toString()]["zones"]).length
            if (nZones > sysVariables['max_nzones']) {
                sysVariables['max_nzones'] = nZones;
            }
        }
    }

    // build summary table
    generateTable();
}

// layout floor plan in the middle panel
function build_floormap() {

    // update configuration panel

    // remove previous list
    d3.select('.floor-list').selectAll('*').remove();
    
    // get number of floors from the default building file and set in the configuration panel
    var nfloors = Object.keys(globalBuildingMap["building"]["floors"]).length;
    jQuery('#nfloors').val(nfloors);

    jQuery('#nfloors').on('change', function(){
        update_zones();
    });

    // update number of floors
    for (var i=0; i<nfloors; i++) {
        var nZones = Object.keys(globalBuildingMap["building"]["floors"]['F'+(i+1).toString()]["zones"]).length;
        addFloor(i, nZones);
    }

    // show configuration panel
    jQuery('#middle-panel').show();  

    // update summary table
    generateTable();
    
    // show summary panel
    jQuery('#right-most-panel').show();                 
}

// get floor layout for the selected building
function get_floormap(b_type, b_indx) {
    jQuery.ajax({
        type: "POST",
        url: "/query",
        data: JSON.stringify({"query_type": "get_default_bmap", "build_type": b_type, "build_indx": b_indx}),
        dataType : "html",
        contentType: "application/json",
        success: function(response) {
            globalBuildingMap = JSON.parse(response);
            get_default();
            build_floormap();
        },
        error: function() {
            alert( "error" );
        }
    });
}

// function to draw building tree
function drw_bld_tree (building_json) {
    
    // Index of clicked building type
    c_indx = building_json.indx;

    // if parent is root, update the legend
    if (building_json["value"] == "building") {
        jQuery("#legend-lmp").text('Select Building Type');
    }

    // remove previous entries from the div
    d3.select('#row-lmp').selectAll("*").remove();

    // add back button in the div
    d3.select('#row-lmp')
        .append('div')
            .attr("class", "col-sm-12 back-button-div")
        .append('button')
            .attr("id", "btn-back")
            .attr("type", "button")
            .attr("class", "btn btn-default back-button")
        .on("click", function(){
            back_button(building_json.value)
        });

    // append parent div for all the sub building types
    d3.select('#row-lmp')
        .append("div")
            .attr("class", "col-sm-12 form-group selection-panel")
            .attr("id", building_json["value"] + "-type");
    
    // create div for each sub building type 
    var divs = d3.select("#" + building_json["value"] + "-type")
        .selectAll('div')
        .data(building_json["children"])
        .enter()
        .append("div")
            .attr("class", "col-sm-5 form-check form-check-inline selection-box")
            .attr("id", function (d){ return d.value;})

    // create selection tag for every sub building type
    divs.append('input')
            .attr("type", "radio")
            .attr("class", function (d){ 
                if (d.type=="leaf") { 
                    return "form-check-input leafRadio";
                } else {
                    return "form-check-input";
                }
            })
            .attr("id", function (d){ return d.parent + "_" + d.value; })
            .attr("name", function (d){ return d.parent; })
            .attr("value", function (d){ return d.value; })
        .on('change', function(d) {
            if (d.type !="leaf") { 
                // if a parent node, go down to lower level
                c_indx = d.indx;
                drw_bld_tree (d);
            } else {
                // if a leaf node, select the level
                get_floormap(d.parent + "_" + d.value, d.indx);
            }
        });
    
    // image icon for sub building type
    var figs = divs.append('label')
                        .attr("class", function (d) { 
                            if (d.type=="leaf") { 
                                return "form-check-label leaf";
                            } else {
                                return "form-check-label";
                            }
                        })
                        .attr("for", function (d){ return d.parent + "_" + d.value; })
                    .append("figure");
    figs.append("img")
            .attr("class", "label-image")
            .attr("alt", function (d){ return d.name; })
            .attr("src", function (d){ return 'static/icons/' + d.icon; })
    figs.append("figcaption")
            .attr("class", "tag")
            .text(function (d){ return d.name; });
}

// when making the building from scratch
jQuery('#btn-make-building').on('click', function() {
    try {
        drw_bld_tree(globalBuildingTypes);
    } catch(err) {
        alert(err.message);
    }
});

// load the JSON file
function onFileSelect(event) {
    jQuery('#uploadHelp').text('The file "' + event.target.files[0].name +  '" has been selected.');
    
    var reader = new FileReader();
    reader.onload = onReaderLoad;
    reader.readAsText(event.target.files[0]);
}

// parse the json file, load only if valid
function onReaderLoad(event){
    try {
        fileObj = JSON.parse(event.target.result);
        validBuildingFile = true;
    } catch (e) {
        alert("Invalid JSON, cannot upload!");
    }
}

// file selection event on the upload modal screen
document.getElementById('input-building-map').addEventListener('change', onFileSelect);

// Click event for upload button on the modal screen
jQuery('#btn-upload-selected-file').on('click', function() {

    // close the modal
    $('#mdl-upload-file').modal('hide');

    // if uploaded file is valid
    if (validBuildingFile) {

        // add query-type for server processing
        fileObj['query_type'] = 'upload_bmap';

        // ajax query
        jQuery.ajax({
            type: "POST",
            url: "/query",
            data: JSON.stringify(fileObj),
            dataType : "html",
            contentType: "application/json",
            success: function(response) {
                // parse the building map and get default appliance list
                globalBuildingMap = JSON.parse(response);
                get_default();
                
                // get c_indx to show selection on building box
                c_indx = globalBuildingMap["building"]["index"];
                var indx_split = c_indx.split("_");

                // update left most panel
                var tempJSON = globalBuildingTypes;
                for (i = 1; i < indx_split.length-1; i++) {
                    tempJSON = tempJSON["children"][(+indx_split[i])-1];
                }
                drw_bld_tree(tempJSON);

                // check the selected building type
                jQuery('#' + globalBuildingMap["building"]["type"]).prop('checked', true);

                // update middle and rightmost containers
                build_floormap();
            },
            error: function() {
                // if ajax failed
                alert(response);
            }
        });
    }
});

// back button in the left most panel
function back_button(b_val) {
    
    // remove panel when changing buildings
    jQuery('#middle-panel').hide();
    jQuery('#right-most-panel').hide();
    
    // change the view to parent building
    var indx_split = c_indx.split("_");
    if (indx_split.length > 1) {
        var tempJSON = globalBuildingTypes;
        for (i = 1; i < indx_split.length-1; i++) {
            tempJSON = tempJSON["children"][(+indx_split[i])-1];
        }
        drw_bld_tree(tempJSON);
    } else {
        // move to index page
        document.location.href = "/";
    }
}

// get default parameters
function get_default() {
    jQuery.ajax({
        type: "POST",
        url: "/query",
        data: JSON.stringify({"query_type": "get_default_alist", "build_type": globalBuildingMap["building"]["type"]}),
        dataType : "html",
        contentType: "application/json",
        success: function(response) {
            globalDefaultAppList = JSON.parse(response);
        },
        error: function() {
            alert( "error" );
        }
    });
}

// download the JSON file locally
jQuery('#btn-save-building').on('click', function(){
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(globalBuildingMap, null, 2)], {
        type: "json"
    }));
    a.setAttribute("download", "buildingMAP.json");
    document.body.appendChild(a);
    
    a.click();
    document.body.removeChild(a);
});

// plot data streams
function plot_data_streams(parameters, data) {
    
    // update data
    for (var i = 0; i < data.length; i++) {
        data[i]["datetime"] = new Date(new Date(data[i]["datetime"]).getTime() + 1000 * 60 * 60 * 24)
        data[i][parameters[0]] = +data[i][parameters[0]]
        data[i][parameters[1]] = +data[i][parameters[1]]
        data[i][parameters[2]] = +data[i][parameters[2]]; 
    }  
    
    // remove previous plot
    d3.select('#div-chart1').selectAll("*").remove();

    // create new chart plot
    var chart1 = d3_timeseries()
                    .margin.right($('#div-chart1').width()/10)
                    .margin.top($('#div-chart1').width()/10)
                    .xscale.label("Milan")
                    .width($('#div-chart1').width())
                    .height(Math.min($('#div-chart1').width()*2/3, 280));

    // add all the data streams
    parameters.forEach(function(d){
        chart1.addSerie(data,{x:'datetime',y:d},{interpolate:'step-before'})
    });

    // plot the chart
    chart1('#div-chart1');
}

// get data streams from the server
function get_data_streams() {

    // get selected parameters
    var selected = [];
    jQuery("#select-parameter option:selected").each(function(){
        selected.push(this.text);
    });
    
    // request to get data from the server
    $.ajax({
        url: "/query",
        type : "POST",
        data: JSON.stringify({"query_type": "get_data", "parameters":selected, "uuid": globalUUID}),
        dataType : "html",
        contentType:"application/json",
        success: function(response) {
            // parse and plot data
            var data = JSON.parse(response);
            plot_data_streams(selected, data);
        },
        error: function(error) {
            console.log("failure!!!");
            console.log(error);
        }
    });
}

// initiate model page
function init_modelpage(response) {
    // show model page panels
    jQuery('#input').html(response.page);

    // maintain uuid
    globalUUID = response.uuid

    // show parameters in the dropdown 
    globalParametersList = response.parameters;
    var selector = d3.select('#select-parameter')
    var opts = selector.selectAll(null)
                .data(globalParametersList)
                .enter()
                .append('option')
                .attr('value', function (d) {
                    return d
                })
                .text(function (d) {
                    return d
                });

    $('select').selectpicker();

    // on button click, get the data and then plot the data
    jQuery("#btn-plot-data").on('click', function(){
        get_data_streams();
    });
}

// on initiating model training
jQuery('#btn-learn-model').on('click', function(){
    $.ajax({
        url: "/query",
        type : "POST",
        data: JSON.stringify({'query_type': 'train', 'map': globalBuildingMap}),
        dataType : "html",
        contentType:"application/json",
        success: function(response) {
            res = JSON.parse(response)
            alert("Please note down the job id: " + res["uuid"]);
            init_modelpage(res);
        },
        error: function(error) {
            console.log("failure!!!");
            console.log(error);
        }
    });
});

// javascript when page loads
jQuery(function(){

    // get building tree
    jQuery.ajax({
        type: "POST",
        url: "/query",
        data: JSON.stringify({"query_type": "get_btree"}),
        dataType : "html",
        contentType: "application/json",
        success: function(response) {
            globalBuildingTypes = JSON.parse(response);
        },
        error: function() {
            alert( "error" );
        }
    })

    // on job selection
    jQuery('#select-job-id').on('change', function() {
        $.ajax({
            url: "/query",
            type : "POST",
            data: JSON.stringify({'query_type': 'fetch_model', 'uuid': jQuery(this).find("option:selected").val()}),
            dataType : "html",
            contentType:"application/json",
            success: function(response) {
                res = JSON.parse(response);
                init_modelpage(res);
            },
            error: function(error) {
                console.log("failure!!!");
                console.log(error);
            }
        });
    })
});
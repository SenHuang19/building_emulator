using Sockets
using HTTP, JSON, CSV, DataFrames, Dates, Serialization

# SETUP TEST CASE
# ---------------
# Set URL for testcase
simStep_inSec   = 5*60;                # in [s]
# ---------------

#--------------- Main code starts from here ------------------------------------
println("Julia has started and waiting for connection ....")
port = 65432
server = listen(ip"0.0.0.0", port)

# DEFINE a struct variable to contain the device information
mutable struct devInfo
    label           ::Any
    control_inputs  ::Any
    measurements    ::Any
    devType         ::Any
    floorId         ::Any
    zoneIdx         ::Any
    devParam        ::Any
    senseIdx        ::Any
end

while true
	#------------------ Socket communication -----------------------------------
    socket = accept(server)           # open socket
    # println("Opened a socket and started receiving data from Python")
    appList = readline(socket)
    println("Received Data. Processing it now ...")

	read_file_in_dict = JSON.parse(appList);

   	if !haskey(read_file_in_dict,"appliances")
        Message = "{status_code: 0}"
        write(socket, Message)
        close(socket)
      	error("appliances NOT found in the JSON file!")
   	end
   	app_list = read_file_in_dict["appliances"];
	# env_list = read_file_in_dict["exogenous"];

	# first add the devices
	numDev   = length(app_list);
   	allDev   = Array{devInfo}(undef,numDev);

   	list_of_zones = [];
   	u_of_interest = [];
   	y_of_interest = [];
   	for iD = 1:numDev
      	allDev[iD]                  = devInfo(undef,undef,undef,undef,undef,undef,undef,undef);
      	allDev[iD].label            = app_list[iD]["app_id"];
      	allDev[iD].control_inputs   = app_list[iD]["control_inputs"];
      	allDev[iD].measurements     = app_list[iD]["measurements"];

      	strip_info = split(app_list[iD]["app_id"],r"[_]");
        println(strip_info);
      	allDev[iD].devType = strip_info[4];
      	allDev[iD].floorId = split(strip_info[2],r"f")[2];
      	allDev[iD].zoneIdx = split(strip_info[3],r"z")[2];
		allDev[iD].devParam = [2.3, rand(Int64(24*60*60/simStep_inSec)), 0.9];  # comfort paramter ALPHA, usage probabilities

      	append!(u_of_interest,allDev[iD].control_inputs)
      	append!(y_of_interest,allDev[iD].measurements)
      	append!(list_of_zones,[(allDev[iD].floorId,allDev[iD].zoneIdx)])
   	end
   	unique!(list_of_zones)

   	for iD = 1:numDev
      	allDev[iD].senseIdx = Array{Int64}(undef,length(allDev[iD].measurements));
      	for jD = 1:length(allDev[iD].measurements)
         	allDev[iD].senseIdx[jD] = findfirst(x->occursin(allDev[iD].measurements[jD],x),y_of_interest);
      	end
   	end

	# next add the exogenous environmental information (e.g. occupancy)
  # 	for iE = 1:length(env_list)
  #    	append!(u_of_interest,env_list[iE]["control_inputs"])
  #    	append!(y_of_interest,env_list[iE]["measurements"])
  # 	end

	println("Completed Reading and Loading Appliance List.")

    # Message = "Found $numDev appliances in $(length(list_of_zones)) zones. Thanks!"
    Message = JSON.json(Dict("status_code"=> 1))
    write(socket, Message)
    close(socket)
end

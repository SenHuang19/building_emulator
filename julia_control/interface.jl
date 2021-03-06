##This module is an example julia-based testing interface.  It uses the
###``requests`` package to make REST API calls to the test case container,
###which mus already be running.  A controller is tested, which is
###imported from a different module.

# GENERAL PACKAGE IMPORT
# ----------------------
using HTTP, JSON, CSV, DataFrames, Dates, Serialization

# DEFINE struct that contains occupancy models (need to be defined at top)
mutable struct occModel
     slotIdx ::Array{Int64}      # slot index assigned to every min in a day
     mean_IN ::Array{Float64}    # mean duration spent inside office in EACH slot
     mean_OUT::Array{Float64}    # mean duration spent outside, in EACH slot
     states  ::Array{Any}        # states (indices) of the MC, in EACH slot
     TPM     ::Array{Any}        # transition probability matrices, in EACH slot
 end

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

# TEST CONTROLLER IMPORT
# ----------------------
include("./controllers.jl")
using .con

# EXOGENOUS INPUT IMPORT
# ----------------------
include("./exogenous.jl")
using .exo

# SETUP TEST CASE
# ---------------
# Set URL for testcase
url = "http://backend:5000"
simLength_inSec = 20*60;         # in [s]
simStep_inSec   = 5*60;                # in [s]
# ---------------

# GET TEST INFORMATION
# --------------------
println("TEST CASE INFORMATION ------------- \n")
# Test case name
name = JSON.parse(String(HTTP.get("$url/name").body))
println("Name:\t\t\t$name")

# Inputs available
inputs = JSON.parse(String(HTTP.get("$url/inputs").body))

# Measurements available
measurements = JSON.parse(String(HTTP.get("$url/measurements").body))

# Default simulation step
step_def = JSON.parse(String(HTTP.get("$url/step").body))
println("Default Simulation Step:\t$step_def")

# store measurements and inputs in csv file
df = DataFrame(Control_inputs=inputs)
CSV.write("control_inputs.csv", sort!(df))
df = DataFrame(Measurements=measurements)
CSV.write("measurements.csv", sort!(df))

# specify the zone(s) and floor(s) you are interested in

if isfile("appList.json") # if the file exists, read from it
   println("Reading the list of appliances from the appList.json file.")
   read_file_in_dict = JSON.parsefile("appList.json"; dicttype=Dict, inttype=Int64, use_mmap=true)
   if !haskey(read_file_in_dict,"appliances")
      error("appliances NOT found in the JSON file!")
   end
   app_list = read_file_in_dict["appliances"];
   env_list = read_file_in_dict["exogenous"];

   # first add the devices
   numDev   = length(app_list);
   allDev   = Array{devInfo}(undef,numDev);

   list_of_zones = [];
   u_of_interest = [];
   y_of_interest = [];
   for iD = 1:numDev
      allDev[iD]                  = devInfo(undef,undef,undef,undef,undef,undef,undef,undef);
      allDev[iD].label            = app_list[iD]["label"];
      allDev[iD].control_inputs   = app_list[iD]["control_inputs"];
      allDev[iD].measurements     = app_list[iD]["measurements"];

      strip_info = split(app_list[iD]["label"],r"[-_]");
      allDev[iD].devType = strip_info[4];
      allDev[iD].floorId = split(strip_info[2],r"F")[2];
      allDev[iD].zoneIdx = split(strip_info[3],r"Z")[2];
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
   for iE = 1:length(env_list)
      append!(u_of_interest,env_list[iE]["control_inputs"])
      append!(y_of_interest,env_list[iE]["measurements"])
   end

else     # define the list manually

   list_of_zones = [(1,4), (1,2)];
   typeDev  = ["PC","Light","Misc"];

   numDev   = length(typeDev)*length(list_of_zones);
   allDev   = Array{devInfo}(undef,numDev);

   if isa(list_of_zones, Tuple)     # only one floor-zone combo is specified
      list_of_zones = [list_of_zones];    # convert into an array of tuples
   end

   u_of_interest = inputs[occursin.("floor$(list_of_zones[1][1])_zon$(list_of_zones[1][2])",inputs)];
   y_of_interest = measurements[occursin.("floor$(list_of_zones[1][1])_zon$(list_of_zones[1][2])",measurements)];
   for id = 2:length(list_of_zones)
      global u_of_interest = [u_of_interest; inputs[occursin.("floor$(list_of_zones[id][1])_zon$(list_of_zones[id][2])",inputs)]];
      global y_of_interest = [y_of_interest; measurements[occursin.("floor$(list_of_zones[id][1])_zon$(list_of_zones[id][2])",measurements)]];
   end

   for iD = 1:numDev
      allDev[iD] = devInfo(undef,undef,undef,undef,undef,undef,undef,undef);
      allDev[iD].sensekey = string("pow",typeDev[iD][1:min(3,length(typeDev[iD]))]);
      allDev[iD].senseIdx = findfirst(x->occursin(Regex(allDev[iD].senseKey,"i"),x),y_of_interest);
      allDev[iD].devParam = [2.3, rand(Int64(24*60*60/simStep_inSec)), 0.9];  # comfort paramter ALPHA, usage probabilities
   end
end

df = DataFrame(select_control_inputs=u_of_interest)
CSV.write("select_control_inputs.csv", sort!(df))
df = DataFrame(select_measurements=y_of_interest)
CSV.write("select_measurements.csv", sort!(df))

#~~~~~~~~~~~~~~~~~~~~~~
# RUN TEST CASE
#~~~~~~~~~~~~~~~~~~~~~~
start_test = Dates.now()
# Reset test case
println("Resetting test case if needed.")
start_inSec = 0;
res = HTTP.put("$url/reset",["Content-Type" => "application/json"], JSON.json(Dict("start" => start_inSec)))
println("Running test case ...")
# Set simulation step
println("Setting simulation step to $simStep_inSec")
res = HTTP.put("$url/step",["Content-Type" => "application/json"], JSON.json(Dict("step" => simStep_inSec)))

# create the variables arrays to be filled with time-series data
tlen = convert(Int, floor(simLength_inSec/simStep_inSec));
ylen = length(y_of_interest);

tSeries  = Array{Any}(undef,tlen,1); # stores the time-indices to pull out sampled data
time_dd  = Array{Any}(undef,tlen,1); # time-indices in DAYS
time_hh  = Array{Any}(undef,tlen,1); # time-indices in HOURS
time_mm  = Array{Any}(undef,tlen,1); # time-indices in MINUTES
ySeries  = Array{Any}(undef,tlen,ylen);
allSeries = Array{Any}(undef,tlen,length(measurements)-1); # -1 because "time" is separate

# simulation loop
for i = 1:tlen
   if i<2
      # Initialize u
      global u_exo, occDur, occParams = exo.initialize(start_inSec,simStep_inSec,list_of_zones);
      global u_con = con.initialize(start_inSec,simStep_inSec,list_of_zones);
   else
      # Compute next control signal
      global u_exo, occDur = exo.next_signal(y, occDur, occParams, list_of_zones);
      global u_con = con.compute_control(y, list_of_zones);
   end
   u = merge(u_exo,u_con);

   # Advance in simulation
   res = HTTP.post("$url/advance", ["Content-Type" => "application/json"], JSON.json(u);retry_non_idempotent=true).body
   global y = JSON.parse(String(res));

   global occDur .+= simStep_inSec/60;     # in minute

   tSeries[i]     = y["time"];
   ySeries[i,:]   = [y[name_y] for name_y in y_of_interest];
   allSeries[i,:] = [y[name_y] for name_y in setdiff(measurements,["time"])];
   if rem(i,max(1,floor(tlen/20)))==0
      println("[status @ $(Dates.format(now(),"HH:MM")) GMT] -- complete $(Int64(round(i/tlen*100)))%")
   end

   # convert time into dd-hh-mm-ss format
   time_dd[i] = convert(Int64,ceil(tSeries[i]/24/3600));
   time_hh[i] = convert(Int64,floor((tSeries[i]-(time_dd[i]-1)*24*3600)/3600));
   time_mm[i] = convert(Int64,floor((tSeries[i]-(time_dd[i]-1)*24*3600-time_hh[i]*3600)/60));
end
occIdx      = findfirst(x->occursin(r"OccSch"i,x),y_of_interest);
occSeries   = ySeries[:,occIdx];
HTTP.post("$url/stop";retry_non_idempotent=true)
println("Test case complete.")
time=(Dates.now()-start_test).value/1000.
println("Elapsed time of test was $time seconds.")

# --------------------
# POST PROCESS RESULTS
# --------------------

# add whatever variables you want to add
colname    = Array{String}(undef,3+ylen+numDev);
colvals    = Array{Any}(undef,tlen,3+ylen+numDev);

colname[1:3] = ["dd","hh","mm"];    # adding column names
colvals[:,1] = time_dd;
colvals[:,2] = time_hh;
colvals[:,3] = time_mm;

colname[4:3+ylen]    = y_of_interest;
colvals[:,4:3+ylen]  = ySeries;

# println("tlen: $tlen, max ID: $(maximum(Int64.(floor.(rem.((time_hh*60+time_mm),24*60)*60/simStep_inSec)))), min ID: $(minimum(Int64.(floor.(rem.((time_hh*60+time_mm),24*60)*60/simStep_inSec))))")

for id = 1:numDev
   colname[3+ylen+id] = string("cmf_$(allDev[id].devType)");
   devUse = Float64.(ySeries[:,allDev[id].senseIdx].>1e-6);
   cmfAlp = allDev[id].devParam[1];
   dayUse = allDev[id].devParam[2];
   colvals[:,3+ylen+id] = (exp.(cmfAlp * (1 .- abs.(devUse - dayUse[Int64.(floor.(rem.(time_hh*60+time_mm,24*60)*60/simStep_inSec))[:] .+ 1]) )) .- 1)/(exp(cmfAlp)-1);
end
# colname[end]   = y_of_interest[occIdx];
# colvals[:,end] = occSeries;

tab = DataFrame(colvals);

rename!(tab, Symbol.(colname), makeunique=true)
CSV.write("result_testcase2.csv",tab)


# this table stores the time-series of ALL the variables
colname    = Array{String}(undef,2+length(measurements));
colvals    = Array{Any}(undef,tlen,2+length(measurements));

colname[1:3] = ["dd","hh","mm"];    # adding column names
colvals[:,1] = time_dd;
colvals[:,2] = time_hh;
colvals[:,3] = time_mm;

colname[4:end] = setdiff(measurements,["time"]);
colvals[:,4:end]  = allSeries;

tab = DataFrame(colvals);

rename!(tab, Symbol.(colname), makeunique=true)
CSV.write("all_result_testcase2.csv",tab)

# stop the emulator
HTTP.put("$url/stop")

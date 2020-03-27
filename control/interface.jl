##This module is an example julia-based testing interface.  It uses the
###``requests`` package to make REST API calls to the test case container,
###which mus already be running.  A controller is tested, which is
###imported from a different module.

# GENERAL PACKAGE IMPORT
# ----------------------
using HTTP, JSON, CSV, DataFrames, Dates

# TEST CONTROLLER IMPORT
# ----------------------
include("./controllers.jl")
using .con

# SETUP TEST CASE
# ---------------
# Set URL for testcase
url = "http://emulator:5000"
simLength_inSec = 120;#7*24*60*60;     # in [s]
simStep_inSec   = 60;              # in [s]
# ---------------

# GET TEST INFORMATION
# --------------------
println("TEST CASE INFORMATION ------------- \n")
# Test case name
name = JSON.parse(String(HTTP.get("$url/name").body))
println("Name:\t\t\t$name")

# Inputs available
inputs = JSON.parse(String(HTTP.get("$url/inputs").body))
# println("Control Inputs:\t\t\t$inputs")
# Measurements available
measurements = JSON.parse(String(HTTP.get("$url/measurements").body))
#println("Measurements:\t\t\t$measurements")

# define a struct variable to contain the device information
mutable struct devInfo
    devType::String
    # powRated::Any      # [kW]
    devParam::Any          # [OPTIONAL] only if needed for calculation of scores
    senseKey::Any
    senseVal::Any
    senseIdx::Any
    transProb::Any
    allStates::Any
    uniqueSeq::Any
end

# Default simulation step
step_def = JSON.parse(String(HTTP.get("$url/step").body))
println("Default Simulation Step:\t$step_def")

# store measurements and inputs in csv file
df = DataFrame(Control_inputs=inputs)
CSV.write("control_inputs.csv", sort!(df))
df = DataFrame(Measurements=measurements)
CSV.write("measurements.csv", sort!(df))

# specify the zone(s) and floor(s) you are interested in

typeDev  = ["PC","Light","Misc"];

dlen     = length(typeDev);
allDev   = Array{devInfo}(undef,dlen);

floor_idx = 1;
zone_idx = 4;

u_of_interest = inputs[occursin.("floor$(floor_idx)_zon$(zone_idx)",inputs)];
y_of_interest = measurements[occursin.("floor$(floor_idx)_zon$(zone_idx)",measurements)];

for iDev = 1:dlen
   allDev[iDev] = devInfo(typeDev[iDev],undef,undef,undef,undef,undef,undef,undef);
   allDev[iDev].senseKey = string("pow",typeDev[iDev][1:min(3,length(typeDev[iDev]))]);
   allDev[iDev].senseIdx = findfirst(x->occursin(Regex(allDev[iDev].senseKey,"i"),x),y_of_interest);
   allDev[iDev].devParam = [2.3, rand(Int64(24*60*60/simStep_inSec)), 0.9];  # comfort paramter ALPHA, usage probabilities
end

df = DataFrame(select_control_inputs=u_of_interest)
CSV.write("select_control_inputs.csv", sort!(df))
df = DataFrame(select_measurements=y_of_interest)
CSV.write("select_measurements.csv", sort!(df))

# RUN TEST CASE
#----------
start_test = Dates.now()
# Reset test case
println("Resetting test case if needed.")
start = 0;#86400*200
res = HTTP.put("$url/reset",["Content-Type" => "application/json"], JSON.json(Dict("start" => start)))
println("Running test case ...")
# Set simulation step
println("Setting simulation step to $simStep_inSec")
res = HTTP.put("$url/step",["Content-Type" => "application/json"], JSON.json(Dict("step" => simStep_inSec)))

# create the variables arrays to be filled witth time-series data
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
      u = con.initialize()
   else
   # Compute next control signal
      u = con.compute_control(y)
   end
   # Advance in simulation
   res = HTTP.post("$url/advance", ["Content-Type" => "application/json"], JSON.json(u);retry_non_idempotent=true).body
   global y = JSON.parse(String(res));

   tSeries[i] = y["time"];
   ySeries[i,:] = [y[name_y] for name_y in y_of_interest];
   allSeries[i,:] = [y[name_y] for name_y in setdiff(measurements,["time"])];
   if rem(i,min(1,floor(tlen/20)))==0
      println("$(Int64(round(i/tlen*100)))% complete ...")
   end

   # convert time into dd-hh-mm-ss format
   time_dd[i] = convert(Int64,ceil(tSeries[i]/24/3600));
   time_hh[i] = convert(Int64,ceil((tSeries[i]-(time_dd[i]-1)*24*3600)/3600));
   time_mm[i] = convert(Int64,ceil((tSeries[i]-(time_dd[i]-1)*24*3600-(time_hh[i]-1)*3600)/60));
end
occIdx      = findfirst(x->occursin(r"OccSch"i,x),y_of_interest);
occSeries   = ySeries[:,occIdx];

println("Test case complete.")
time=(Dates.now()-start_test).value/1000.
println("Elapsed time of test was $time seconds.")

# --------------------
# POST PROCESS RESULTS
# --------------------

# add whatever variables you want to add
colname    = Array{String}(undef,3+ylen+dlen);
colvals    = Array{Any}(undef,tlen,3+ylen+dlen);

colname[1:3] = ["dd","hh","mm"];    # adding column names
colvals[:,1] = time_dd;
colvals[:,2] = time_hh;
colvals[:,3] = time_mm;

colname[4:3+ylen]    = y_of_interest;
colvals[:,4:3+ylen]  = ySeries;

for id = 1:dlen
   colname[3+ylen+id] = string("cmf_$(allDev[id].devType)");
   devUse = Float64.(ySeries[:,allDev[id].senseIdx].>1e-6);
   cmfAlp = allDev[id].devParam[1];
   dayUse = allDev[id].devParam[2];
   colvals[:,3+ylen+id] = (exp.(cmfAlp * (1 .- abs.(devUse - dayUse[Int64.(floor.((time_hh*60+time_mm)*60/simStep_inSec))]) )) .- 1)/(exp(cmfAlp)-1);
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

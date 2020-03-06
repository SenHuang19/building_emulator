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
length = 1200#86400
step = 600
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

# Default simulation step
step_def = JSON.parse(String(HTTP.get("$url/step").body))
println("Default Simulation Step:\t$step_def")

# store measurements and inputs in csv file
df = DataFrame(Control_inputs=inputs)
CSV.write("control_inputs.csv", sort!(df))
df = DataFrame(Measurements=measurements)
CSV.write("measurements.csv", sort!(df))

# specify the zone(s) and floor(s) you are interested in

floor_idx = 1;
zone_idx = 4;

u_of_interest = inputs[occursin.("floor$(floor_idx)_zon$(zone_idx)",inputs)];
y_of_interest = measurements[occursin.("floor$(floor_idx)_zon$(zone_idx)",measurements)];

# println("Control Inputs:\t\t\t$u_of_interest")
# println("Measurements:\t\t\t$y_of_interest")

df = DataFrame(select_control_inputs=u_of_interest)
CSV.write("select_control_inputs.csv", sort!(df))
df = DataFrame(select_measurements=y_of_interest)
CSV.write("select_measurements.csv", sort!(df))

# RUN TEST CASE
#----------
start_test = Dates.now()
# Reset test case
println("Resetting test case if needed.")
start=86400*200
res = HTTP.put("$url/reset",["Content-Type" => "application/json"], JSON.json(Dict("start" => start)))
println("Running test case ...")
# Set simulation step
println("Setting simulation step to $step")
res = HTTP.put("$url/step",["Content-Type" => "application/json"], JSON.json(Dict("step" => step)))

# simulation loop
for i = 1:convert(Int, floor(length/step))
    if i<2
    # Initialize u
       u = con.initialize()
    else
    # Compute next control signal
       u = con.compute_control(y)
    end
    # Advance in simulation
    res=HTTP.post("$url/advance", ["Content-Type" => "application/json"], JSON.json(u);retry_non_idempotent=true).body
    global y = JSON.parse(String(res))
end

println("Test case complete.")
time=(Dates.now()-start_test).value/1000.
println("Elapsed time of test was $time seconds.")

# --------------------
# POST PROCESS RESULTS
# --------------------
# Get result data
res = JSON.parse(String(HTTP.get("$url/results").body))

time = [x/1.0 for x in res["y"]["time"]]; # in [s]

# convert time into dd-hh-mm-ss format
time_dd = convert.(Int64,ceil.(time/24/3600));
time_hh = convert.(Int64,ceil.((time-(time_dd.-1)*24*3600)/3600));
time_mm = convert.(Int64,ceil.((time-(time_dd.-1)*24*3600-(time_hh.-1)*3600)/60));
time_ss = convert.(Int64,ceil.(time-(time_dd.-1)*24*3600-(time_hh.-1)*3600-(time_mm.-1)*60));

# add whatever variables you want to add
ylen = size(y_of_interest)[1];
colnames    = Array{String}(undef,4+ylen);
colvals     = Array{Any}(undef,4+ylen);
colnames[1:4] = ["dd","hh","mm","ss"];    # adding column names
colvals[1:4]  = [time_dd,time_hh,time_mm,time_ss];
for iy = 1:ylen
   colvals[4+iy]  = res["y"][y_of_interest[iy]]; # pick the iy-th output
   colnames[4+iy] = y_of_interest[iy];
end
tab = DataFrame(colvals);

# names!(tab, Symbol.(colnames))
rename!(tab, Symbol.(colnames))
CSV.write("result_testcase2.csv",tab)

# stop the emulator
HTTP.put("$url/stop")

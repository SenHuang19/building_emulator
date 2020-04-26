module con

using Serialization

"""
This module implements an external signal to overwrite existing controllers in the emulator.
"""

function compute_control(y::Dict, occDur::Array{Float64}, occParams::Array{Any}, list_of_zones::Any)
    # compute the control input from the measurement.
    # y contains the current values of the measurements.
    # {<measurement_name>:<measurement_value>}
    # compute the control input from the measurement.
    # u: dict Defines the control input to be used for the next step.
    # {<input_name> : <input_value>}

    time_inMin  = Int64(floor(rem(y["time"]/60, 24*60))+1);    # minute of the day

    u = Dict();

    for iZ = 1:length(list_of_zones)    # assign new occupancy for each zone
        cOcc = y["floor$(list_of_zones[iZ][1])_zon$(list_of_zones[iZ][2])_OccSch_y"];
        cDur = occDur[iZ];

        timeSlot    = occParams[iZ].slotIdx[time_inMin];
        mean_OUT    = occParams[iZ].mean_OUT[timeSlot];
        mean_IN     = occParams[iZ].mean_IN[timeSlot];
        states      = occParams[iZ].states[timeSlot];
        TPM         = occParams[iZ].TPM[timeSlot];

        cDurCDF = (1-exp(-cDur/mean_IN))*cOcc + (1-exp(-cDur/mean_OUT))*(1-cOcc);
        cState  = (ceil(10*cDurCDF)-1)*2 + cOcc + 1;

        if !in(cState,states)   # need to adjust the state
            searchSpace = states[rem.(states.-1,2).==rem(cState-1,2)];
            if isempty(searchSpace)   # NO state with same occupancy exists
                cState = (minimum(ceil.(states/2))-1)*2 + 2-rem(cState-1,2);     # toggle the occ. (and start the counter)
            else
                # value of the other info (=duration)
                compMet = abs.(ceil.(searchSpace/2).-ceil(cState/2));
                cState  = searchSpace[findfirst(x->x==minimum(compMet), compMet)];
            end
        end
        pmf = TPM[findfirst(x->x==cState,states),:][:];
        cmf = cumsum(pmf);

        nState = states[findfirst(x->x>rand(),cmf)];
        newOcc = Float64(rem(nState-1,2));

        # update occupnacy value and the occupancy duration (IF NEEDED)
        if newOcc!=cOcc  # reset occupancy duration if status changes
            occDur[iZ] = 0.0;
            merge!(u, Dict("floor$(list_of_zones[iZ][1])_zon$(list_of_zones[iZ][2])_oveOccSch_activate" => 1, "floor$(list_of_zones[iZ][1])_zon$(list_of_zones[iZ][2])_oveOccSch_u" => newOcc));
        end
    end

    merge!(u, Dict("floor1_zon4_oveTSetRooCoo_u" => 295.15,"floor1_zon4_oveTSetRooCoo_activate" => 1))
    return u, occDur
end

function initialize(start_inSec::Int64,simStep_inSec::Int64,list_of_zones::Any)
    # u: dict Defines the initial control input to be used for the next step.
    # {<input_name> : <input_value>}

    u = Dict();

    # TEST whether the occupancy model file is accessible or not
    if isfile("occParams.out")
       println("Custom occupancy (input) data found and would be used")
       open("occParams.out") do file
          global occParamsLib = deserialize(file);
       end
       occParams = Array{Any}(undef,length(list_of_zones));
       for iZ = 1:length(list_of_zones)
           occParams[iZ] = occParamsLib[1]; # for now, just pick the 1st office
           # modify the TPM as needed
           for iD = 1:length(occParams[iZ].TPM)     # for each timeslot in the day
               occParams[iZ].TPM[iD] = (occParams[iZ].TPM[iD])^(simStep_inSec/60);
           end
       end

       start_inMin  = rem(start_inSec/60, 24*60);    # minute of the day
       if start_inMin<8*60 || start_inMin>10*60
           start_occ = 0.0;         # binary: {0,1}
           dur_inMin = 120.0;         # specify in minute
       else
           start_occ = Float64(rand()>0.5);
           dur_inMin = Float64(15*(1+rand()>0.5));
       end
       # update the initial occupancy values in the selected zones
       occDur = dur_inMin * ones(length(list_of_zones));
       for id = 1:length(list_of_zones)
           merge!(u, Dict("floor$(list_of_zones[id][1])_zon$(list_of_zones[id][2])_oveOccSch_activate" => 1, "floor$(list_of_zones[id][1])_zon$(list_of_zones[id][2])_oveOccSch_u" => start_occ))
       end

    else
       error("No custom occupancy data found ... please check!")
    end

    merge!(u, Dict("floor1_zon4_oveTSetRooCoo_oveTRoo_u" => 295.15,"floor1_zon4_oveTSetRooCoo_activate" => 1))
    return u, occDur, occParams
end

end

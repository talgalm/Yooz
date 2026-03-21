/*  
    Parameters: p_fnUpdatePerSec -> callback function and p_nTimerDuration -> Time duration 
    startTimer() -> to start timer 
    resetTimer() -> to reset timer
    destoryTimer() -> stop timer anytime by using 
    This will stop when timer will reach to 0 seconds
*/
function CustomizedTimer (p_fnUpdatePerSec, p_nTimerDuration) {
    let fnUpdatePerSec = p_fnUpdatePerSec;
    let nTimerDuration = p_nTimerDuration;
    let objInterval = null;

    fnUpdatePerSec(nTimerDuration);

    return {
        startTimer: () => {
            objInterval = setInterval(() => {
                fnUpdatePerSec(--nTimerDuration);
        
                if(nTimerDuration == 0)
                    clearInterval(objInterval);
            }, 1000);
        },

        resetTimer: (p_nTimerDuration) => {
            clearInterval(objInterval);
            nTimerDuration = p_nTimerDuration;
            startTimer();
        },

        pauseTimer: () => {
            if(nTimerDuration != 0)
                clearInterval(objInterval);
        },

        playTimer: (objCustomizedTimer) => {
            if(nTimerDuration != 0)
                objCustomizedTimer.startTimer();
        },

        destoryTimer: () => clearInterval(objInterval)
    };
}
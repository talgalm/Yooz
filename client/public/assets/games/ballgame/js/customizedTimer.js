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
    let bIsPaused = false;

    fnUpdatePerSec(nTimerDuration);

    const stop = () => {
        clearInterval(objInterval);
        objInterval = null;
    };

    const start = () => {
        stop();
        if (nTimerDuration <= 0) return;
        objInterval = setInterval(() => {
            if (--nTimerDuration <= 0) stop();
            fnUpdatePerSec(nTimerDuration);
        }, 1000);
    };

    return {
        startTimer: start,

        resetTimer: (p_nTimerDuration) => {
            bIsPaused = false;
            nTimerDuration = p_nTimerDuration;
            fnUpdatePerSec(nTimerDuration);
            start();
        },

        pauseTimer: () => {
            if (!objInterval) return;
            stop();
            bIsPaused = true;
        },

        playTimer: () => {
            if (!bIsPaused) return;
            bIsPaused = false;
            start();
        },

        destoryTimer: () => {
            bIsPaused = false;
            stop();
        }
    };
}

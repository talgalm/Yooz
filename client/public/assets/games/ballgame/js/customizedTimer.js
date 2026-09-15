/*
    Parameters: p_fnUpdatePerSec -> callback function and p_nTimerDuration -> Time duration
    startTimer() -> to start timer
    resetTimer(duration) -> to restart timer from duration
    pauseTimer() / playTimer() -> suspend and resume a running timer (tab hidden / visible)
    destoryTimer() -> stop timer anytime; only resetTimer() starts it again
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

    // Clears the previous interval first, so starting twice can't leave an
    // orphan interval ticking alongside the new one.
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

        // Resumes only what pauseTimer() stopped. A destroyed timer (question
        // answered) must stay stopped when the tab becomes visible again.
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

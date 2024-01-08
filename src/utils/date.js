const formatHoursAndMinutes = (date) => {
  let hours = date.getHours() % 12;
  const minutes = date.getMinutes();
  const amPm = date.getHours() < 12 ? 'AM' : 'PM';
  hours = hours === 0 ? 12: hours;
  const formattedHours = hours < 10 ? `0${hours}` : hours;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

  return `${formattedHours}:${formattedMinutes} ${amPm}`;
};

export const formatNow = (timezone) => {
  const now = new Date();
  
  return timezone
    ? now.toLocaleString('en-US', {
        hour12: true,
        hour: 'numeric',
        minute: 'numeric',
        timeZone: timezone,
      })
    : formatHoursAndMinutes(now);
};

export const formatTimeStamps = (timezone, timestamps) => {
  return new Date(timestamps + 'Z').toLocaleString('en-US', {
    hour12: true,
    hour: 'numeric',
    minute: 'numeric',
    timeZone: timezone,
  });
};

const CALENDAR_EVENTS = [
    {
      name: 'Running',
      day: 'wednesday',
      time: '09:00',
      modality: 'In-person',
      location: 'Boulder',
      url: '',
      attendees: 'Alice, Jack, Ben',
    },
    {
      name: 'Lecture',
      day: 'wednesday',
      time: '11:00',
      modality: 'In-person',
      location: 'Boulder',
      url: '',
      attendees: '',
    },
  ];
  
  const CALENDAR_DAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  
  let EVENT_MODAL;
  
  /********************** PART B: 6.1: CREATE CALENDAR *************************/
  
  function createBootstrapCard(day) {
    // @TODO: Use `document.createElement()` function to create a `div`
    var card = document.createElement('div');
      // Let's add some bootstrap classes to the div to upgrade its appearance
      // This is the equivalent of <div class="col-sm m-1 bg-white rounded px-1 px-md-2"> in HTML
      card.className = 'col-sm m-1 bg-white rounded px-1 px-md-2';
  
    // This the equivalent of <div id="monday"> in HTML
    card.id = day.toLowerCase();
    return card;
  }
  
  function createTitle(day) {
    // Create weekday as the title.
  
    // @TODO: Use `document.createElement()` function to create a `div` for title
    const title = document.createElement('div');
    title.className = 'h6 text-center position-relative py-2';
    title.innerHTML = day;
  
    return title;
  }
  
  function createEventIcon(card) {
    // @TODO: Use `document.createElement()` function to add an icon button to the card. Use `i` to create an icon.
    const icon = document.createElement('i');
    icon.className =
      'bi bi-calendar-plus btn position-absolute translate-middle start-100  rounded p-0 btn-link';
  
    // adding an event listener to the click event of the icon to open the modal
    // the below line of code would be the equivalent of:
    // <i onclick="openEventModal({day: 'monday'})"> in HTML.
    icon.setAttribute('onclick', `openEventModal({day: ${card.id}})`);
    return icon;
  }
  
  function createEventDiv() {
    //  @TODO: Use `document.createElement()` function to add a `div` to the weekday card, which will be populated with events later.
    const eventsDiv = document.createElement('div');
      // We are adding a class for this container to able to call it when we're populating the days
      // with the events
      eventsDiv.classList.add('event-container');
  
    return eventsDiv;
  }
  
  /* The function initializeCalendar() initializes the Calendar for your events and it gets called `onload` of your page.
  We will complete the TODOs to render the Calendar in the next few steps. */
  
  // You will be implementing this function in section 2: Create Modal
  function initializeCalendar() {
  
    // Step 1: Initialize the modal (No changes required here).
    initializeEventModal();
  
    // @TODO: Step 2: Select the calendar div element by its id. Replace '...' with the correct code to get the div.
    // Hint: Use either `document.getElementById('id')` or `document.querySelector('#id')` to find the element.
    const calendarElement = document.getElementById('calendar');
  
    // Step 3: Loop through each day in the CALENDAR_DAYS array(No changes required here).
    // This array contains the days of the week (e.g., 'Monday', 'Tuesday', etc.).
    CALENDAR_DAYS.forEach(day => {
  
      // @TODO: Step 4: Uncomment the following line and complete the function call createBootstrapCard(day) function
      var card = createBootstrapCard(day);
  
      // @TODO: Step 5: Filling below lines and add the created card to the calendar element using appendChild().
      calendarElement.appendChild(card);
  
      // @TODO: Step 6: Uncomment the below line and call createTitle(day) function.
      var title = createTitle(day);
  
      // @TODO: Step 7: Filling below lines and add title to the card. Use appendChild()
      card.appendChild(title);
  
      // @TODO: Step 8: Uncomment the below line and call createEventIcon(card) function.
      var icon = createEventIcon(card);
  
      // @TODO: Step 9:  Filling below lines and add icon to the title. Use appendChild()
      title.appendChild(icon);
  
      // @TODO: Step 10: Uncomment the below line and and call createEventDiv() function.
      var eventsDiv = createEventDiv(card);
  
      // @TODO: Step 11: Filling below lines and add eventsDiv to the card. Use appendChild()
      card.appendChild(eventsDiv);
  
      // @TODO: Step 12: Filling below lines and do a console.log(card) to verify the output on your console.
      console.log(card);
  
      });
  
    // @TODO: Step 13: Uncomment this after you implement the updateDOM() function
    updateDOM();
  }
  // end of initializeCalendar()
  
  /********************** PART B: 6.2: CREATE MODAL ****************************/
  
  function initializeEventModal() {
    // @TODO: Create a modal using JS. The id will be `event-modal`:
    // Reference: https://getbootstrap.com/docs/5.3/components/modal/#via-javascript
    EVENT_MODAL = new bootstrap.Modal('#event_modal')
  
  }
  function openEventModal({ id, day }) 
  {
    // Since we will be reusing the same modal for both creating and updating events,
    // we're creating variables to reference the title of the modal and the submit button
    // in javascript so we can update the text suitably
    const submit_button = document.querySelector("#submit_button");
    const modal_title = document.querySelector(".modal-title");
  
    // Check if the event exists in the CALENDAR_EVENTS by using `id`
    // Note that on the first try, when you attempt to access an event that does not exist
    // an event will be added to the list. This is expected.
    let event = CALENDAR_EVENTS[id];
  
    // If event is undefined, i.e it does not exist in the CALENDAR_EVENTS, then we create a new event.
    // Else, we load the current event into the modal.
    if (!event) {
      event = {
        name: "",
        day: day,
        time: "",
        modality: "",
        location: "",
        url: "",
        attendees: "",
      };
  
      // @TODO: Update the innerHTML for modalTitle and submitButton
      // Replace <> with the correct attribute
      modal_title.innerHTML = "Create Event";
      submit_button.innerHTML = "Create Event";
  
      // Allocate a new event id. Note that nothing is inserted into the CALENDAR_EVENTS yet.
      // @TODO: Set the id to be the length of the CALENDAR_EVENTS because we are adding a new element
      id = CALENDAR_EVENTS.length;
  
  
    }
    else {
      // We will default to "Update Event" as the text for the title and the submit button
      modal_title.innerHTML = "Update Event";
      submit_button.innerHTML = "Update Event";
    }
  
    // Once the event is fetched/created, populate the modal.
    // Use document.querySelector('<>').value to get the form elements. Replace <>
    // Hint: If it is a new event, the fields in the modal will be empty.
    document.querySelector("#event_name").value = event.name;
  
    // @TODO: Update remaining form fields of the modal with suitable values from the event.
    document.querySelector("#event_time").value = event.time;
    document.querySelector("#event_modality").value = event.modality;
    document.querySelector("#event_location").value = event.location;
    document.querySelector("#event_remote_url").value = event.url;
    document.querySelector("#event_attendees").value = event.attendees;
  
  
    // Location options depend on the event modality
    // @TODO: pass event.modality as an argument to the updateLocationOptions() function. Replace <> with event.modality.
    updateLocationOptions(event.modality);
  
    // Set the "action" event for the form to call the updateEventFromModal
    // when the form is submitted by clicking on the "Creat/Update Event" button
    const form = document.querySelector("#event_form");
    form.setAttribute("action", `javascript:updateEventFromModal(${id})`);
  
    EVENT_MODAL.show();
  }
  
  function updateEventFromModal(id) {
    // @TODO: Pick the modal field values using document.querySelecter(<>).value,
    // and assign it to each field in CALENDAR_EVENTS.
    debugger;
    CALENDAR_EVENTS[id] = {
      name: document.querySelector('#event_name').value,
      day: document.querySelector('#event_weekday').value,
      time: document.querySelector('#event_time').value,
      modality: document.querySelector('#event_modality').value,
      location: document.querySelector('#event_location').value,
      url: document.querySelector('#event_remote_url').value,
      attendees: document.querySelector('#event_attendees').value,
    };
  
    // Update the dom to display the newly created event and hide the event modal
    updateDOM();
    EVENT_MODAL.hide();
  }
  
  function updateLocationOptions(modality_value) {
    // @TODO: get the "Location" and "Remote URL" HTML elements from the modal.
    // Use document.querySelector() or document.getElementById().
    const location =  document.getElementById('event_location');
    const remoteUrl = document.getElementById('event_remote_url');
    const location_group = document.getElementById('event_location_group');
    const url_group = document.getElementById("event_url_group");
    // @TODO: Depending on the "value" change the visibility style of these fields on the modal.
    // Use conditional statements.
    if (modality_value == "In-person") {
      location_group.classList.remove('hidden');
      url_group.classList.add('hidden');
      location.classList.remove('hidden');
      remoteUrl.classList.add('hidden');
    } else {
      location_group.classList.add('hidden');
      url_group.classList.remove('hidden');
       location.classList.add('hidden');
       remoteUrl.classList.remove('hidden');
    } 
  }
  
  /********************** PART B: 6.3: UPDATE DOM ******************************/
  
  function createEventElement(id) {
    // @TODO: create a new div element. Use document.createElement().
    var eventElement = document.createElement('div');
  
    // Adding classes to the <div> element.
    eventElement.classList = "event row border rounded m-1 py-1";
  
    // @TODO: Set the id attribute of the eventElement to be the same as the input id.
    // Replace <> with the correct HTML attribute
    eventElement.id = `event-${id}`;
    return eventElement;
  }
  
  function createTitleForEvent(event) {
    var title = document.createElement('div');
    title.classList.add('col', 'event-title');
    title.innerHTML = event.name;
    return title;
  }
  
  function updateDOM() {
    const events = CALENDAR_EVENTS;
  
    events.forEach((event, id) => {
      // First, let's try to update the event if it already exists.
  
      // @TODO: Use the `id` parameter to fetch the object if it already exists.
      // Replace <> with the appropriate variable name
      // In templated strings, you can include variables as ${var_name}.
      // For eg: let name = 'John';
      // let msg = `Welcome ${name}`;
      let eventElement = document.querySelector(`#event-${id}`);
  
      // if event is undefined, i.e. it doesn't exist in the CALENDAR_EVENTS array, make a new one.
      if (eventElement === null) {
        eventElement = createEventElement(id);
        const title = createTitleForEvent(event);
        // @TODO: Append the title to the event element. Use .append() or .appendChild()
        eventElement.append(title);
      } else {
        // @TODO: Remove the old element while updating the event.
        // Use .remove() with the eventElement to remove the eventElement.
        eventElement.remove();
        // eventElement = createEventElement(id);
        // const title = createTitleForEvent(event);
        // eventElement.append(title);
      }
  
      // Add the event name
      const title = eventElement.querySelector('div.event-title');
      title.innerHTML = event.name;
  
      // Add a tooltip with more information on hover
      // @TODO: you will add code here when you are working on for Part C.
  
      // @TODO: On clicking the event div, it should open the modal with the fields pre-populated.
      // Replace "<>" with the triggering action.
      eventElement.setAttribute('onclick', `openEventModal({id: ${id}})`);
      debugger;
  
      // Add the event div to the parent
      document
        .querySelector(`#${event.day} .event-container`)
        .appendChild(eventElement);
    });
  
    updateTooltips(); // Declare the function in the script.js. You will define this function in Part B.
  }
  
  /********************** PART C: 1. Display Tooltip ***************************/
  
  function updateTooltips() {
    // @TODO: Display tooltip with the Name, Time and Location of the event.
    // The formatting of the contents of the tooltip is up to your discretion.
  
  
    const events = CALENDAR_EVENTS;
    events.forEach((event, id) => {
    const eventElem = document.querySelector(`#event-${id}`);
  
    if (eventElem) {
      const tooltipContent = `Name: ${event.name} <br> Time: ${event.time} <br> Location: ${event.location}`;
      eventElem.setAttribute('data-bs-toggle', 'tooltip');
      eventElem.setAttribute('data-bs-html', 'true');
      eventElem.setAttribute('data-bs-title', tooltipContent);
  
      new bootstrap.Tooltip(eventElem);
    }
  });
  
  }
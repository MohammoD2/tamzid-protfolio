(() => {
  const form = document.querySelector('#contactForm');
  const status = document.querySelector('#contactFormStatus');

  if (!form) {
    return;
  }

  const setStatus = (message, type = '') => {
    if (!status) {
      return;
    }

    status.textContent = message;
    status.className = `contact-form-status ${type}`.trim();
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const project = String(formData.get('project') || '').trim();
    const submitButton = form.querySelector('button[type="submit"]');

    formData.set('_replyto', email);
    formData.set('_subject', `New Project Inquiry from ${name || 'Website Visitor'}${project ? ` - ${project}` : ''}`);

    setStatus('Sending your project inquiry...', 'is-sending');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
    }

    try {
      const response = await fetch('https://formsubmit.co/ajax/contact.tamzid.me@gmail.com', {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Project inquiry email failed');
      }

      form.reset();
      setStatus('Message sent successfully. Tamzid will get your project inquiry by email.', 'is-success');
    } catch (error) {
      setStatus('Sorry, the message could not be sent right now. Please email Tamzid directly or try again.', 'is-error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Send Project Inquiry';
      }
    }
  });
})();

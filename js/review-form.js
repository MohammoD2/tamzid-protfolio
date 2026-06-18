(() => {
  const form = document.querySelector('#reviewForm');
  const status = document.querySelector('#reviewFormStatus');

  if (!form) {
    return;
  }

  const setStatus = (message, type = '') => {
    if (!status) {
      return;
    }

    status.textContent = message;
    status.className = `review-form-status ${type}`.trim();
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const submitButton = form.querySelector('button[type="submit"]');

    formData.set('_replyto', email);
    formData.set('_subject', `New Portfolio Review from ${name || 'Website Visitor'}`);

    setStatus('Sending your review...', 'is-sending');

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
        throw new Error('Review email failed');
      }

      form.reset();
      setStatus('Thank you. Your review has been sent to Tamzid.', 'is-success');
    } catch (error) {
      setStatus('Sorry, the review could not be sent right now. Please try again.', 'is-error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Send Review by Email';
      }
    }
  });
})();

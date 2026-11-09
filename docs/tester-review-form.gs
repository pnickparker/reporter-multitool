/**
 * Builds the tester review form for Mobile News Bureau / Reporter Multi-Tool.
 *
 * How to use (about 2 minutes):
 *   1. Go to script.google.com and click "New project".
 *   2. Delete whatever is in the editor, paste this whole file, and click Save.
 *   3. Pick "createTesterReviewForm" in the function dropdown and click Run.
 *   4. Approve the permissions (it only needs to create a form in your Drive).
 *      Google will say the app is "unverified" - that's because you wrote it; choose
 *      Advanced > Go to (project name).
 *   5. Open "Execution log": it prints the link to SEND (the live form) and the link
 *      to EDIT (your copy, where you can also link responses to a Sheet).
 *
 * Questions are written from the interview list in BUSINESS_NOTES.md.
 */
function createTesterReviewForm() {
  var form = FormApp.create('Mobile News Bureau: tester review');
  form.setDescription(
    'Thanks for using the app these past weeks. This takes about 8 minutes. ' +
    'Honest answers help more than nice ones, and "I didn\'t use that" is a useful answer. ' +
    'Where you can, tell us about a real time you used it, not what you think you might do.'
  );
  form.setConfirmationMessage('Thank you! Nick may follow up with a quick call.');
  form.setProgressBar(true);

  var NOT_USED = "Didn't use";

  // ---- About you -------------------------------------------------------
  form.addSectionHeaderItem().setTitle('About you');
  form.addTextItem().setTitle('Your name').setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle('What phone do you mostly use it on?')
    .setChoiceValues(['iPhone', 'Android', 'Computer', 'Mix of these'])
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle('How often did you use it over the past few weeks?')
    .setChoiceValues([
      'Almost every assignment',
      'A few times a week',
      'About once a week',
      'A few times in total',
      'Barely'
    ])
    .setRequired(true);
  form.addCheckboxItem()
    .setTitle('What did you use it for? (check all that apply)')
    .setChoiceValues([
      'Audio interviews, to get quotes',
      'Video interviews or clips',
      'Social post drafts',
      'Notes',
      'Photos or documents',
      'Captions (.srt) for video editing',
      'Long recordings (30+ minutes)'
    ])
    .showOtherOption(true);

  // ---- A real story ----------------------------------------------------
  form.addPageBreakItem().setTitle('A real example');
  form.addParagraphTextItem()
    .setTitle('Walk us through the last real story you used it on.')
    .setHelpText('What did you record, what did you take out of the app, and what did you still do by hand?')
    .setRequired(true);
  form.addParagraphTextItem()
    .setTitle('Was there a time you could have used it and didn\'t? What did you use instead (Otter, Voice Memos, typing it up, something else)?');

  // ---- Ratings ---------------------------------------------------------
  form.addPageBreakItem().setTitle('How well did each part work?');
  form.addGridItem()
    .setTitle('Rate each part. 1 = poor, 5 = great.')
    .setRows([
      'Uploading / capturing a recording',
      'Transcript accuracy',
      'Speaker labels and naming speakers',
      'Which quotes it picked',
      'The quote scores',
      'Social post drafts',
      'Speed (how long you waited)',
      'Playing a quote to check it'
    ])
    .setColumns([NOT_USED, '1', '2', '3', '4', '5']);
  form.addParagraphTextItem()
    .setTitle('Anything in that list you rated 1 or 2: what happened?');

  // ---- Trust -----------------------------------------------------------
  form.addPageBreakItem().setTitle('Trust');
  form.addMultipleChoiceItem()
    .setTitle('Before using a quote, did you check it against the audio?')
    .setChoiceValues(['Always', 'Usually', 'Sometimes', 'Never'])
    .setRequired(true);
  form.addParagraphTextItem()
    .setTitle('Did you ever find a quote, a speaker label or a post that was wrong or that you didn\'t trust? What was it?');
  form.addParagraphTextItem()
    .setTitle('Did anything fail, get stuck or get lost (an upload, a recording, a video)? Please include the exact words on screen if you remember them.')
    .setHelpText('If a recording was ever lost, say so plainly. That matters more than anything else on this form.');

  // ---- Value -----------------------------------------------------------
  form.addPageBreakItem().setTitle('How much does it matter to you?');
  form.addMultipleChoiceItem()
    .setTitle('How would you feel if you could no longer use it?')
    .setChoiceValues(['Very disappointed', 'Somewhat disappointed', 'Not disappointed'])
    .setRequired(true);
  form.addParagraphTextItem()
    .setTitle('What is the one thing you would miss most?');
  form.addParagraphTextItem()
    .setTitle('What is the one thing that would make you stop using it?');

  // ---- Price -----------------------------------------------------------
  form.addPageBreakItem().setTitle('Price (rough numbers are fine)');
  form.addTextItem()
    .setTitle('What do you pay each month now for transcription or similar tools? ($0 is fine)');
  form.addMultipleChoiceItem()
    .setTitle('If you kept using this, who would pay?')
    .setChoiceValues([
      'I would, out of my own pocket',
      'The outlet I work for would',
      'It depends on the outlet',
      'Neither. I would not pay for it'
    ]);
  form.addMultipleChoiceItem()
    .setTitle('How would you prefer to pay?')
    .setChoiceValues([
      'A flat monthly price per person',
      'A flat monthly price per newsroom',
      'Pay per hour of recording',
      'Pay per recording',
      'No preference'
    ]);
  form.addSectionHeaderItem()
    .setTitle('Per month, for the way you use it, at what price would it be...')
    .setHelpText('Just a dollar amount for each. There are no wrong answers.');
  form.addTextItem().setTitle('...so cheap you would doubt it? ($ per month)');
  form.addTextItem().setTitle('...a bargain? ($ per month)');
  form.addTextItem().setTitle('...getting expensive, but you would still consider it? ($ per month)');
  form.addTextItem().setTitle('...too expensive to consider? ($ per month)');

  // ---- Storage and trust ----------------------------------------------
  form.addPageBreakItem().setTitle('Your recordings');
  form.addMultipleChoiceItem()
    .setTitle('Where should your recordings be kept?')
    .setChoiceValues([
      'In my own Google Drive, so I control them',
      'Stored by the app for a set time, such as 90 days',
      'I don\'t care, as long as nothing is lost',
      'I\'m not sure'
    ]);
  form.addParagraphTextItem()
    .setTitle('Would your editor or your sources have concerns about recordings going through an app like this? What would they ask?');

  // ---- What next -------------------------------------------------------
  form.addPageBreakItem().setTitle('What next');
  form.addParagraphTextItem()
    .setTitle('If we could fix or add only ONE thing next, what should it be?')
    .setRequired(true);
  form.addParagraphTextItem()
    .setTitle('Is there anything in the app you never use or that gets in your way?');
  form.addMultipleChoiceItem()
    .setTitle('Would you want it as an app from the App Store / Google Play, or is the web version fine?')
    .setChoiceValues([
      'A store app would be better',
      'Web version is fine',
      'No preference'
    ]);

  // ---- Optional, by type of work --------------------------------------
  form.addPageBreakItem()
    .setTitle('Only if it applies to you')
    .setHelpText('Skip anything that doesn\'t.');
  form.addParagraphTextItem()
    .setTitle('If you shoot video: where did capture or upload cause problems, and do you edit in Premiere, CapCut or something else? Do you post the social drafts as written or rewrite them?');
  form.addParagraphTextItem()
    .setTitle('If you work mostly with audio: how often were speaker labels wrong, and is "upload audio, get ranked quotes" the whole job for you?');

  // ---- Wrap-up ---------------------------------------------------------
  form.addPageBreakItem().setTitle('Last two');
  form.addMultipleChoiceItem()
    .setTitle('Would you keep using it for another month, free, in return for honest feedback (and a short testimonial if you like it)?')
    .setChoiceValues(['Yes', 'Maybe', 'No']);
  form.addParagraphTextItem()
    .setTitle('Who else should try it? Names and how to reach them (only if you are comfortable sharing).');

  Logger.log('SEND THIS LINK: ' + form.getPublishedUrl());
  Logger.log('EDIT THE FORM: ' + form.getEditUrl());
}

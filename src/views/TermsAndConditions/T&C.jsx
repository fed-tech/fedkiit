"use client";

import React, { useEffect } from "react";

import Style from "./styles/T&C.module.scss";

function TermsAndConditions() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={Style.background}>
      <div className={Style.main}>
        <div className={Style.heading}>
          <h1
            className={Style.terms}
            style={{
              background: "var(--primary)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Terms &
          </h1>
          <h1 className={Style.cond}>Conditions</h1>
        </div>

        {/* para1 */}
        <p>
          Welcome to <strong>Federation of Entrepreneurship </strong> at Kalinga
          Institute of Industrial Technology ! We are excited to have you join
          our community of aspiring entrepreneurs. Please read the following
          Terms and Conditions carefully, as they outline the rules and
          guidelines governing your participation in the society.
        </p>

        {/* para2 */}
        <p>
          <strong
            style={{
              background: "var(--primary)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            1. Membership:{" "}
          </strong>
          <br />
          <br />
          a. Membership in <strong>Federation of Entrepreneurship </strong> is
          open to all currently enrolled students at Kalinga Institute of
          Industrial Technology, subject to the eligibility criteria mentioned
          below. <br />
          b. By becoming a member, you agree to abide by these Terms and
          Conditions and any additional rules or guidelines set forth by the
          society. <br />
          c. <strong>First-year students are not eligible</strong> to register
          for or participate in the society&apos;s events unless explicitly
          permitted by the organizers.
        </p>

        {/* para 3 */}
        <p>
          <strong
            style={{
              background: "var(--primary)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            2. Code of Conduct:
          </strong>{" "}
          <br />
          <br />
          a. Treat all members, guests, and society organizers with respect,
          kindness, and professionalism. <br />
          b. Maintain a supportive and inclusive environment, refraining from
          any form of discrimination, harassment, bullying, or inappropriate
          behavior. <br />
          c. Avoid engaging in activities that may bring disrepute to the
          society or college. <br />
          d. Adhere to ethical business practices and encourage integrity and
          honesty among members. <br />
          e. Respect the confidentiality of sensitive information shared within
          the society. <br />
          f. Any behavior of an <strong>offensive, abusive, threatening,
          disruptive, or inappropriate nature</strong> during society events
          will not be tolerated and may result in removal from the event and
          further disciplinary action.
        </p>

        {/* para 4 */}
        <p>
          <strong
            style={{
              background: "var(--primary)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            3. Society Events and Activities:{" "}
          </strong>{" "}
          <br />
          <br />
          a. Participate actively in society events, workshops, seminars, and
          other activities organized by the Entrepreneurship Society. <br />
          b. Notify the society organizers in advance if you are unable to
          attend an event or activity after registering.
          <br />
          c. Be punctual and respectful of the schedules and timelines
          established for events. <br />
          d. <strong>Outsiders are not permitted</strong> to attend society
          events unless they have been explicitly authorized by the society
          organizers. <br />
          e. The society reserves the right to deny entry to any individual who
          does not meet the event&apos;s eligibility or registration requirements.
        </p>

        {/* para 5 */}
        <p>
          <strong
            style={{
              background: "var(--primary)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            4. Intellectual Property:
          </strong>{" "}
          <br />
          <br />
          a. Respect the intellectual property rights of others, including but
          not limited to copyrights, trademarks, and patents. <br />
          b. Do not use the society platform to share or distribute copyrighted
          or proprietary material without the necessary permissions.
        </p>

        {/* para 6 */}
        <p>
          <strong
            style={{
              background: "var(--primary)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            5. Personal Liability:{" "}
          </strong>
          <br />
          <br />
          a. Participate in society activities at your own risk. <br />
          b. <strong>Federation of Entrepreneurship </strong> and its organizers
          shall not be held liable for any personal injury, loss, damage, or
          theft that may occur during society events.
        </p>

        {/* para 7 */}
        <p>
          <strong
            style={{
              background: "var(--primary)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            6. Data Privacy:
          </strong>{" "}
          <br />
          <br />
          a. <strong>Federation of Entrepreneurship </strong> will collect and
          store personal information in accordance with applicable data
          protection laws. <br />
          b. By joining the society, you consent to the collection, storage, and
          processing of your personal information for society-related purposes.
        </p>

        {/* para 8 */}
        <p>
          <strong
            style={{
              background: "var(--primary)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            7. Amendments and Termination:
          </strong>{" "}
          <br />
          <br />
          a. <strong>Federation of Entrepreneurship</strong> reserves the right
          to amend these Terms and Conditions at any time. Any changes will be
          communicated to the members in advance. <br />
          b. The society organizers may terminate your membership if you violate
          these Terms and Conditions or engage in behavior that is deemed
          harmful to the society or its members.
        </p>

        {/* para 9 */}
        <p>
          <strong
            style={{
              background: "var(--primary)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            8. Governing Law:
          </strong>{" "}
          <br />
          <br />
          a. These Terms and Conditions shall be governed by and construed in
          accordance with the laws of Bhubaneswar, Odisha, India. <br />
          b. Any disputes arising out of or in connection with these Terms and
          Conditions shall be subject to the exclusive jurisdiction of the
          courts in Bhubaneswar, Odisha, India.
        </p>

        {/* para 10 */}
        <p>
          <strong
            style={{
              background: "var(--primary)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            9. Payments and Refund Policy:
          </strong>{" "}
          <br />
          <br />
          a. <strong>All payments made through this website are
          non-refundable</strong>, unless otherwise explicitly stated by the
          Federation of Entrepreneurship. <br />
          b. The organisation will never ask for or collect payments through
          unofficial channels other than the authorized website or officially
          communicated payment methods.
        </p>

        {/* para 11 */}
        <p>
          <strong
            style={{
              background: "var(--primary)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            10. Photography, Videography and Recording:
          </strong>{" "}
          <br />
          <br />
          a. <strong>Recording, photography, videography, or audio recording
          of society events is prohibited</strong> unless explicitly permitted
          by the society organizers. <br />
          b. Participants must not record, reproduce, livestream, or distribute
          event proceedings, presentations, discussions, or other event
          content without prior authorization. <br />
          c. The organizers reserve the right to take appropriate action in
          case of unauthorized recording or distribution of event content.
        </p>

        {/* para 12 */}
        <p>
          <strong
            style={{
              background: "var(--primary)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            11. Prohibited Conduct During Events:
          </strong>{" "}
          <br />
          <br />
          a. Participants must maintain appropriate and respectful conduct
          throughout all society events. <br />
          b. Any conduct that is offensive, abusive, threatening,
          discriminatory, harassing, disruptive, vulgar, or otherwise
          inappropriate is strictly prohibited. <br />
          c. Participants must follow instructions given by event organizers,
          volunteers, security personnel, and college authorities. <br />
          d. The organizers reserve the right to remove any participant from
          an event without refund if they violate these rules or engage in
          prohibited conduct.
        </p>

        {/* para 13 */}
        <p>
          <strong
            style={{
              background: "var(--primary)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            12. Event Entry and Eligibility:
          </strong>{" "}
          <br />
          <br />
          a. Registration does not automatically guarantee entry if the
          participant does not satisfy the event&apos;s eligibility requirements.
          <br />
          b. Participants may be required to present valid identification or
          registration details at the time of entry. <br />
          c. Only registered and eligible participants will be permitted to
          attend events unless otherwise authorized by the organizers.
        </p>

        {/* para 14 */}
        <p>
          By joining <strong>Federation of Entrepreneurship </strong> at Kalinga
          Institute of Industrial Technology, you acknowledge that you have
          read, understood, and agreed to these Terms and Conditions. Failure
          to comply with these terms may result in the termination of your
          membership, cancellation of event registration, removal from an
          event, or other appropriate action by the society.
        </p>

        {/* para 15 */}
        <p>
          If you have any questions or concerns regarding these Terms and
          Conditions, please contact the society organizers for clarification.
        </p>
      </div>
    </div>
  );
}

export default TermsAndConditions;
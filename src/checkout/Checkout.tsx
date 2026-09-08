import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { DateRange, type RangeKeyDict, type Range } from "react-date-range";
import { format, isBefore, differenceInDays } from "date-fns";
import { useCart } from "../context/CartContext";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer } from "react-toastify";
import { useTranslation } from "react-i18next";

interface LocationState {
  directBooking?: boolean;
  room?: any;
  rooms?: any[];
}

interface BookingRoomDetails {
  roomName: string;
  roomType: string;
  bedType: string;
  guests: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  pricePerNight: number;
  subtotal: number;
}

function Checkout() {
  const { cart} = useCart();

  const location = useLocation();
  const state = location.state as LocationState | null;


  const { t } = useTranslation();

  const [roomsToBook, setRoomsToBook] = useState<any[]>([]);

  const [specialRequests, setSpecialRequest] =
    useState<string>("");

  const [customerName, setCustomerName] =
    useState<string>("");

  const [customerEmail, setCustomerEmail] =
    useState<string>("");

  const [customerPhone, setCustomerPhone] =
    useState<string>("");

  const [guestCounts, setGuestCounts] =
    useState<Record<string, number>>({});

  const [dateRanges, setDateRanges] =
    useState<Record<string, Range[]>>({});

  const [calendarOpen, setCalendarOpen] =
    useState<Record<string, boolean>>({});

  const [validationError, setValidationError] =
    useState<string>("");

  const [loading, setLoading] =
    useState<boolean>(false);

  const WHATSAPP_NUMBER = "255764338937";
  const RESERVATION_EMAIL = "bnabhotel@gmail.com";

  useEffect(() => {
    if (state?.rooms && state.rooms.length > 0) {
      setRoomsToBook(state.rooms);
      return;
    }

    if (state?.room) {
      setRoomsToBook([state.room]);
      return;
    }

    // Get rooms from cart when coming from Cart
    setRoomsToBook(cart);
  }, [state, cart]);


  useEffect(() => {
    if (roomsToBook.length === 0) {
      return;
    }

    const newGuests: Record<string, number> = {};
    const newRanges: Record<string, Range[]> = {};
    const newCalendarToggles: Record<string, boolean> = {};

    roomsToBook.forEach((room) => {
      const roomKey = `${room._id}-${room.selectedConfiguration.roomType}`;

      newGuests[roomKey] = 1;

      newRanges[roomKey] = [
        {
          startDate: new Date(),
          endDate: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ),
          key: "selection",
        },
      ];

      newCalendarToggles[roomKey] = false;
    });

    setGuestCounts(newGuests);
    setDateRanges(newRanges);
    setCalendarOpen(newCalendarToggles);
  }, [roomsToBook]);


  const handleGuestChange = (
    roomKey: string,
    value: string,
    maxPeople: number
  ) => {
    const num = parseInt(value, 10);

    if (isNaN(num)) {
      return;
    }

    if (num < 1 || num > maxPeople) {
      return;
    }

    setGuestCounts((prev) => ({
      ...prev,
      [roomKey]: num,
    }));

    setValidationError("");
  };

  const handleDateChange = (
    roomKey: string,
    ranges: RangeKeyDict
  ) => {
    setDateRanges((prev) => ({
      ...prev,
      [roomKey]: [ranges.selection],
    }));

    setValidationError("");
  };


  const validateBooking = (): boolean => {
    setValidationError("");

    if (roomsToBook.length === 0) {
      setValidationError(
        t("No room has been selected.")
      );

      return false;
    }

    if (!customerName.trim()) {
      setValidationError(
        t("Please enter your name.")
      );

      return false;
    }

    if (!customerPhone.trim() && !customerEmail.trim()) {
      setValidationError(
        t("Please enter your phone number or email address.")
      );

      return false;
    }

    for (const room of roomsToBook) {
      const roomKey =
        `${room._id}-${room.selectedConfiguration.roomType}`;

      const guests =
        guestCounts[roomKey] || 1;

      const range =
        dateRanges[roomKey]?.[0];

      if (
        !range?.startDate ||
        !range?.endDate ||
        !isBefore(
          range.startDate,
          range.endDate
        )
      ) {
        setValidationError(
          `${t("Invalid dates selected for")} ${room.title} (${room.selectedConfiguration.roomType}).`
        );

        return false;
      }

      if (
        guests >
        room.selectedConfiguration.maxPeople
      ) {
        setValidationError(
          `"${room.title}" (${room.selectedConfiguration.roomType}) ${t(
            "allows up to"
          )} ${room.selectedConfiguration.maxPeople} ${t(
            "guests"
          )}.`
        );

        return false;
      }
    }

    return true;
  };

  const getBookingDetails =
    (): BookingRoomDetails[] => {
      return roomsToBook
        .map((room) => {
          const roomKey =
            `${room._id}-${room.selectedConfiguration.roomType}`;

          const range =
            dateRanges[roomKey]?.[0];

          if (
            !range?.startDate ||
            !range?.endDate
          ) {
            return null;
          }

          const nights = differenceInDays(
            range.endDate,
            range.startDate
          );

          const guests =
            guestCounts[roomKey] || 1;

          const pricePerNight =
            Number(
              room.selectedConfiguration.price
            );

          const subtotal =
            nights *
            pricePerNight *
            guests;

          return {
            roomName: room.title,
            roomType:
              room.selectedConfiguration.roomType,
            bedType:
              room.selectedConfiguration.bedType ||
              "Not specified",
            guests,
            checkIn: format(
              range.startDate,
              "MMM dd, yyyy"
            ),
            checkOut: format(
              range.endDate,
              "MMM dd, yyyy"
            ),
            nights,
            pricePerNight,
            subtotal,
          };
        })
        .filter(
          (
            room
          ): room is BookingRoomDetails =>
            room !== null
        );
    };


  const getTotalAmount = () => {
    return getBookingDetails().reduce(
      (total, room) =>
        total + room.subtotal,
      0
    );
  };


  const buildBookingMessage = () => {
    const bookingDetails =
      getBookingDetails();

    const totalAmount =
      getTotalAmount();

    let message =
      `Hello, I would like to make a room booking enquiry.\n\n`;

    message +=
      `CUSTOMER DETAILS\n`;

    message +=
      `Name: ${customerName}\n`;

    if (customerPhone.trim()) {
      message +=
        `Phone: ${customerPhone}\n`;
    }

    if (customerEmail.trim()) {
      message +=
        `Email: ${customerEmail}\n`;
    }

    message +=
      `\nBOOKING DETAILS\n`;

    bookingDetails.forEach(
      (room, index) => {
        message +=
          `\nRoom ${index + 1}\n`;

        message +=
          `Room: ${room.roomName}\n`;

        message +=
          `Room Type: ${room.roomType}\n`;

        message +=
          `Bed Type: ${room.bedType}\n`;

        message +=
          `Check-in: ${room.checkIn}\n`;

        message +=
          `Check-out: ${room.checkOut}\n`;

        message +=
          `Number of nights: ${room.nights}\n`;

        message +=
          `Guests: ${room.guests}\n`;

        message +=
          `Price per night: $${room.pricePerNight.toFixed(
            2
          )}\n`;

        message +=
          `Subtotal: $${room.subtotal.toFixed(
            2
          )}\n`;
      }
    );

    message +=
      `\nTOTAL ESTIMATED AMOUNT: $${totalAmount.toFixed(
        2
      )}\n`;

    message +=
      `\nSPECIAL REQUESTS\n`;

    message +=
      `${specialRequests.trim() || "None"}\n`;

    message +=
      `\nPlease confirm room availability and the final price before confirming my booking.\n\n`;

    message +=
      `Thank you.`;

    return message;
  };


  const handleWhatsAppBooking = () => {
    if (!validateBooking()) {
      return;
    }

    setLoading(true);

    const message =
      buildBookingMessage();

    const whatsappUrl =
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        message
      )}`;

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );

    setLoading(false);
  };

  /* booking using email */
  const handleEmailBooking = () => {
    if (!validateBooking()) {
      return;
    }

    setLoading(true);

    const message =
      buildBookingMessage();

    const subject =
      `Room Booking Enquiry - ${customerName}`;

    const emailUrl =
      `mailto:${RESERVATION_EMAIL}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(message)}`;

    window.location.href =
      emailUrl;

    setLoading(false);
  };


  const totalAmount =
    getTotalAmount();

  if (roomsToBook.length === 0) {
    return (
      <div className="px-4 md:px-16 mt-32 max-w-5xl mx-auto">
        <div className="text-center py-16">
          <h1 className="text-3xl font-bold text-orange-500 mb-4">
            {t("No room selected")}
          </h1>

          <p className="text-gray-500">
            {t(
              "Please select a room before making a booking enquiry."
            )}
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="px-4 md:px-16 mt-32 max-w-5xl mx-auto pb-16">

      <h1 className="text-4xl font-bold text-center mb-4 text-orange-500">
        {t("Room Booking Enquiry")}
      </h1>

      <p className="text-center text-gray-500 max-w-2xl mx-auto mb-10">
        {t(
          "Enter your booking details and contact us through WhatsApp or email. Your booking will only be confirmed after our team confirms availability."
        )}
      </p>

      {/* CUSTOMER DETAILS */}

      <div className="card bg-base-500 shadow-xl p-6 mb-6">

        <h2 className="text-xl font-semibold mb-4">
          {t("Your Contact Details")}
        </h2>

        <div className="grid md:grid-cols-3 gap-4">

          <div>
            <label className="label">
              <span className="label-text">
                {t("Full Name")} *
              </span>
            </label>

            <input
              type="text"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setValidationError("");
              }}
              placeholder={t("Enter your full name")}
              className="input input-bordered w-full text-gray-800"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">
                {t("Phone Number")}
              </span>
            </label>

            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                setValidationError("");
              }}
              placeholder={t("Your phone number")}
              className="input input-bordered w-full text-gray-800"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">
                {t("Email Address")}
              </span>
            </label>

            <input
              type="email"
              value={customerEmail}
              onChange={(e) => {
                setCustomerEmail(e.target.value);
                setValidationError("");
              }}
              placeholder={t("Your email address")}
              className="input input-bordered w-full text-gray-800"
            />
          </div>

        </div>

        <p className="text-xs text-gray-500 mt-3">
          {t(
            "Please provide at least a phone number or email address so we can contact you."
          )}
        </p>

      </div>

      {/* ROOMS */}

      <div className="grid gap-6">

        <AnimatePresence>

          {roomsToBook.map((room) => {

            const roomKey =
              `${room._id}-${room.selectedConfiguration.roomType}`;

            const range =
              dateRanges[roomKey]?.[0];

            return (
              <motion.div
                key={roomKey}
                initial={{
                  opacity: 0,
                  y: 30,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  x: -50,
                  transition: {
                    duration: 0.3,
                  },
                }}
                transition={{
                  duration: 0.4,
                }}
                className="rounded-xl border border-base-300 p-6 shadow-sm bg-base-500 relative"
              >

                <h2 className="text-xl font-semibold text-primary mb-1">
                  {t(room.title)}
                </h2>

                <p className="text-sm text-gray-400">
                  {t(
                    room.selectedConfiguration
                      .roomType
                  )}

                  {" • "}

                  {t("Max people")}:

                  {" "}

                  {
                    room.selectedConfiguration
                      .maxPeople
                  }
                </p>

                {/* GUESTS */}

                <div className="mt-4 grid md:grid-cols-2 gap-4">

                  <div>

                    <label className="label">
                      <span className="label-text">
                        {t("Number of Guests")}
                      </span>
                    </label>

                    <input
                      type="number"
                      min={1}
                      max={
                        room.selectedConfiguration
                          .maxPeople
                      }
                      value={
                        guestCounts[roomKey] || 1
                      }
                      onChange={(e) =>
                        handleGuestChange(
                          roomKey,
                          e.target.value,
                          room
                            .selectedConfiguration
                            .maxPeople
                        )
                      }
                      className="input input-bordered w-full text-gray-800"
                    />

                  </div>

                </div>

                {/* DATES */}

                <div className="mt-4">

                  <label className="label">
                    <span className="label-text">
                      {t(
                        "Check-in - Check-out"
                      )}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setCalendarOpen(
                        (prev) => ({
                          ...prev,
                          [roomKey]:
                            !prev[roomKey],
                        })
                      )
                    }
                    className="btn btn-outline w-full text-left"
                  >
                    {range?.startDate &&
                      range?.endDate
                      ? `${format(
                        range.startDate,
                        "MMM dd, yyyy"
                      )} - ${format(
                        range.endDate,
                        "MMM dd, yyyy"
                      )}`
                      : t(
                        "Select dates"
                      )}
                  </button>

                  {calendarOpen[
                    roomKey
                  ] && (
                      <div className="relative z-30 mt-2 overflow-x-auto">

                        <DateRange
                          editableDateInputs
                          onChange={(
                            ranges
                          ) =>
                            handleDateChange(
                              roomKey,
                              ranges
                            )
                          }
                          moveRangeOnFirstSelection={
                            false
                          }
                          ranges={
                            dateRanges[
                            roomKey
                            ]
                          }
                          minDate={
                            new Date()
                          }
                        />

                      </div>
                    )}

                </div>

                {/* SPECIAL REQUESTS */}

                <div className="mt-4">

                  <label className="label">
                    <span className="label-text">
                      {t(
                        "Special Requests"
                      )}
                    </span>
                  </label>

                  <textarea
                    name="specialRequests"
                    placeholder={t(
                      "Enter any special request if needed"
                    )}
                    className="textarea textarea-bordered w-full text-gray-800"
                    onChange={(e) =>
                      setSpecialRequest(
                        e.target.value
                      )
                    }
                    value={
                      specialRequests
                    }
                    rows={3}
                  />

                </div>

              </motion.div>
            );
          })}

        </AnimatePresence>

      </div>

      {/* SUMMARY */}

      <div className="mt-10 card bg-base-500 shadow-xl p-6">

        <h2 className="text-xl font-semibold mb-4">
          {t("Booking Summary")}
        </h2>

        <ul className="text-sm space-y-4">

          {getBookingDetails().map(
            (room, index) => (
              <li
                key={index}
                className="border-b border-base-300 pb-3"
              >

                <div className="font-medium">
                  {room.roomName}
                </div>

                <div className="text-gray-500">
                  {room.roomType}
                  {" • "}
                  {room.guests}{" "}
                  {t("guest(s)")}
                </div>

                <div className="text-gray-500">
                  {room.checkIn}
                  {" → "}
                  {room.checkOut}
                </div>

                <div className="mt-1">

                  {room.nights}{" "}
                  {t("night(s)")} ×{" "}
                  ${room.pricePerNight.toFixed(
                    2
                  )} ×{" "}
                  {room.guests}{" "}
                  {t("guest(s)")}

                  {" = "}

                  <span className="font-semibold">
                    $
                    {room.subtotal.toFixed(
                      2
                    )}
                  </span>

                </div>

              </li>
            )
          )}

        </ul>

        <div className="text-right text-xl font-bold mt-6">

          {t("Estimated Total")}: $

          {totalAmount.toFixed(2)}

        </div>

        <p className="text-xs text-gray-500 text-right mt-2">
          {t(
            "Final price and availability will be confirmed by our team."
          )}
        </p>

        {validationError && (
          <div className="alert alert-error mt-4">
            <span>
              {validationError}
            </span>
          </div>
        )}

      </div>

      {/* ACTION BUTTONS */}

      <div className="mt-6 grid sm:grid-cols-2 gap-4">

        <motion.button
          whileHover={{
            scale: 1.02,
          }}
          whileTap={{
            scale: 0.98,
          }}
          disabled={loading}
          onClick={
            handleWhatsAppBooking
          }
          className="btn btn-success text-white text-lg"
        >
          {loading
            ? t("Processing...")
            : t(
              "Book via WhatsApp"
            )}
        </motion.button>

        <motion.button
          whileHover={{
            scale: 1.02,
          }}
          whileTap={{
            scale: 0.98,
          }}
          disabled={loading}
          onClick={
            handleEmailBooking
          }
          className="btn btn-primary text-lg"
        >
          {loading
            ? t("Processing...")
            : t(
              "Send Booking Request by Email"
            )}
        </motion.button>

      </div>

      {/* IMPORTANT NOTICE */}

      <div className="mt-6 text-center">

        <p className="text-sm text-gray-500">
          {t(
            "Please note: Sending this request does not automatically confirm your reservation. Our team will contact you to confirm availability, price and payment arrangements."
          )}
        </p>

      </div>

      <ToastContainer
        position="top-center"
        autoClose={3000}
      />

    </div>
  );
}

export default Checkout;

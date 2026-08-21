"use client";

import { forwardRef, useRef, useState } from "react";
import PropTypes from "prop-types";
import { FaRegCalendarAlt } from "react-icons/fa";
import Select, { components } from "react-select";
import DatePicker from "react-date-picker";
import { AiOutlineDown } from "react-icons/ai";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import DatePickerWithTime from "react-datepicker";
import styles from "./styles/Core.module.scss";

const CustomInput = forwardRef(
  ({ value, onClick, placeholder = "Select Date & Time" }, ref) => (
    <div
      onClick={onClick}
      ref={ref}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <p
        style={{
          margin: "4px",
          fontSize: "12px !important",
          opacity: value ? 1 : 0.5,
          fontWeight: "100 !important",
        }}
      >
        {value || placeholder}
      </p>
      <FaRegCalendarAlt
        color="#fff"
        size={18}
        style={{
          position: "absolute",
          top: "20%",
          right: "8px",
        }}
      />
    </div>
  )
);

CustomInput.displayName = "CustomInput";

CustomInput.propTypes = {
  value: PropTypes.string,
  onClick: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

const customStyles = {
  control: (provided) => ({
    ...provided,
    display: "flex",
    outline: "none",
    width: "99.5%",
    fontSize: "12px",
    backgroundColor: "transparent",
    borderRadius: "4px",
    color: "#fff",
    marginBottom: "0",
    maxHeight: "40px",
    marginLeft: "8px",
    marginRight: "8px",
    marginTop: "4px",
    position: "relative",
    border: "1px solid rgba(211, 211, 211, 0.5)",
    boxShadow: "none",
    "&:hover": {
      borderColor: "#fff !important",
    },
  }),
  menu: (provided) => ({
    ...provided,
    width: "99.5%",
    marginLeft: "8px",
  }),
  menuPortal: (provided) => ({ ...provided, zIndex: 111 }),
  placeholder: (provided) => ({
    ...provided,
    display: "flex",
    alignItems: "center",
    marginTop: "-7px",
  }),
  option: (provided, state) => ({
    ...provided,
    color: state.isSelected ? "#FF8A00" : "#2D2D2D",
    backgroundColor: state.isSelected ? "#2D2D2D" : "#fff",
    cursor: "pointer",
    width: "99%",
    border: "none",
    margin: "0 auto",
    borderRadius: "4px",
    "&:hover": {
      transition: "ease-in-out 0.3s",
      backgroundColor: "#2D2D2D",
      color: "#FF8A00",
      margin: "2px auto",
    },
    "&:active": {
      backgroundColor: "#2D2D2D",
      color: "#FF8A00",
    },
  }),
  indicatorSeparator: (provided) => ({
    ...provided,
    display: "none",
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    marginTop: "-7px",
    fontSize:"larger"
  }),
};

const DropdownIndicator = (props) => {
  return (
    <components.DropdownIndicator {...props}>
      <AiOutlineDown
        color="#fff"
        size={20}
        style={{
          position: "absolute",
          right: "12px",
          top: "25%",
        }}
      />
    </components.DropdownIndicator>
  );
};

const Input = (props) => {
  const {
    type = "text",
    containerStyle,
    style,
    placeholder,
    value,
    onChange,
    label,
    options,
    name,
    showLabel = true,
    // Defaults to "" because it is interpolated into a template literal below.
    // Without it, every caller that omits the prop rendered a literal
    // "undefined" in the class list.
    className = "",
    containerClassName = "",
    ...rest
  } = props;
  const dateRef = useRef(null);
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const [showPassword, setshowPassword] = useState(false);
  const [previewFile, setpreviewFile] = useState(null);

  // When callers pass only `onChange` (no `value`), keep the field uncontrolled.
  // Defaulting `value` to "" used to force every input controlled at "" — typing
  // never appeared because React kept resetting the DOM value.
  const isControlled = Object.prototype.hasOwnProperty.call(props, "value");
  const controlledValue = isControlled ? (value ?? "") : undefined;
  const valueProps = isControlled ? { value: controlledValue } : {};

  const filterPassedTime = (time) => {
    const currentDate = new Date();
    const selectedDate = new Date(time);

    return currentDate.getTime() < selectedDate.getTime();
  };

  const getInputTypes = () => {
    switch (type) {
      case "text":
        return (
          <input
            name={name}
            className={`${styles.input} ${className}`}
            type={type}
            style={style || {}}
            placeholder={placeholder}
            {...valueProps}
            onChange={onChange}
            {...rest}
          />
        );

      case "number":
        return (
          <input
            name={name}
            className={`${styles.input} ${className}`}
            type={type}
            style={style || {}}
            placeholder={placeholder}
            {...valueProps}
            onChange={onChange}
            {...rest}
          />
        );

      case "textArea":
        return (
          <textarea
            name={name}
            className={`${styles.input} ${styles.inputTxtArea} ${className}`}
            type={type}
            style={style || {}}
            placeholder={placeholder}
            {...valueProps}
            onChange={onChange}
            {...rest}
          />
        );

      case "select":
        return (
          <div>
            <Select
              name={name}
              placeholder={placeholder}
              value={
                isControlled
                  ? options.find((option) => option.value === value) || null
                  : undefined
              }
              options={options}
              onChange={(selectedOption) => onChange(selectedOption.value)}
              styles={customStyles}
              components={{ DropdownIndicator }}
              isSearchable={false}
              className={className}
              menuPosition="auto"
              {...rest}
            />
          </div>
        );

      case "date":
        return (
          <div>
            <DatePicker
              name={name}
              className={`${styles.input} ${styles.inputDate} ${className}`}
              ref={dateRef}
              placeholder={placeholder}
              value={value}
              onChange={onChange}
              clearIcon={null}
              style={style || {}}
              calendarIcon={
                <FaRegCalendarAlt
                  color="#fff"
                  size={18}
                  style={{
                    position: "absolute",
                    top: "25%",
                    right: "12px",
                  }}
                />
              }
              {...rest}
            />
          </div>
        );
      case "datetime-local":
        return (
          <div className={`${styles.input} ${styles.inputDate} ${className}`}>
            <DatePickerWithTime
              name={name}
              ref={dateRef}
              value={value}
              onChange={onChange}
              clearIcon={null}
              showTimeSelect
              filterTime={filterPassedTime}
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="time"
              dateFormat="MMMM d, yyyy h:mm"
              customInput={<CustomInput placeholder={placeholder} />}
              {...rest}
            />
          </div>
        );
      case "radio":
        return (
          <div className={styles.checkboxWrapper}>
            <input
              name={name}
              className={styles.checkboxInput}
              type="radio"
              placeholder={placeholder}
              value={value}
              onChange={onChange}
              id={rest.id || `${name}-${value}`}
              {...rest}
            />
            <label
              className={styles.checkboxLabel}
              htmlFor={rest.id || `${name}-${value}`}
            >
              {label}
            </label>
          </div>
        );
      case "checkbox":
        return (
          <div className={styles.checkboxWrapper}>
            <input
              name={name}
              className={styles.checkboxInput}
              type="checkbox"
              placeholder={placeholder}
              value={value}
              onChange={onChange}
              id={rest.id || `${name}-${value}`}
              {...rest}
            />
            <label
              className={styles.checkboxLabel}
              htmlFor={rest.id || `${name}-${value}`}
            >
              {label}
            </label>
          </div>
        );

      case "password":
        return (
          <div>
            <div
              style={{
                position: "relative",
              }}
            >
              <input
                name={name}
                maxLength={rest.maxLength || 20}
                max={rest.max || 20}
                className={styles.input}
                type={showPassword ? "text" : "password"}
                style={style || {}}
                placeholder={placeholder}
                {...valueProps}
                onChange={onChange}
                {...rest}
              />
              {showPassword ? (
                <FaEyeSlash
                  onClick={() => setshowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "16px",
                    top: "25%",
                    cursor: "pointer",
                  }}
                  color="#fff"
                  size={18}
                />
              ) : (
                <FaEye
                  onClick={() => setshowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "16px",
                    top: "25%",
                    cursor: "pointer",
                  }}
                  color="#fff"
                  size={18}
                />
              )}
            </div>
          </div>
        );
      case "file":
        return (
          <div
            className={styles.input}
            onClick={() => fileRef.current?.click()}
            style={{
              height: "40px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              userSelect: "none",
            }}
          >
            <input
              ref={fileRef}
              name={name}
              type={type}
              style={{
                display: "none",
              }}
              placeholder={placeholder}
              onChange={() => {
                const e = {
                  target: {
                    value: fileRef.current.files[0],
                  },
                };
                setpreviewFile(URL.createObjectURL(fileRef.current.files[0]));
                onChange(e);
              }}
              {...rest}
            />
            {previewFile && (
              <img
                src={previewFile}
                style={{
                  height: "24px",
                  width: "24px",
                  borderRadius: "8px",
                  marginRight: "8px",
                }}
              />
            )}
            <span
              style={{
                color: "#fff",
                opacity: value ? 1 : 0.5,
                width: "100%",
                overflow: "hidden",
              }}
            >
              {value || "No file selected"}
            </span>
          </div>
        );
      case "image":
        return (
          <div
            className={styles.input}
            onClick={() => {
              imgRef.current?.click();
            }}
            style={{
              height: "40px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              userSelect: "none",
            }}
          >
            <input
              ref={imgRef}
              name={name}
              type={"file"}
              accept="image/png, image/jpeg, image/jpg"
              style={{
                display: "none",
              }}
              placeholder={placeholder}
              onChange={() => {
                const e = {
                  target: {
                    value: imgRef.current.files[0],
                  },
                };
                setpreviewFile(URL.createObjectURL(imgRef.current.files[0]));
                onChange(e);
              }}
              {...rest}
            />
            {previewFile && (
              <img
                src={previewFile}
                style={{
                  height: "24px",
                  width: "24px",
                  borderRadius: "8px",
                  marginRight: "8px",
                }}
              />
            )}
            <span
              style={{
                color: "#fff",
                opacity: value ? 1 : 0.5,
                width: "100%",
                overflow: "hidden",
              }}
            >
              {value || "No images selected"}
            </span>
          </div>
        );
      default:
        return (
          <input
            name={name}
            className={styles.input}
            type={type}
            style={style || {}}
            placeholder={placeholder}
            {...valueProps}
            onChange={onChange}
            {...rest}
          />
        );
    }
  };

  return (
    <div
      className={`${styles.containerInput} ${containerClassName}`}
      style={
        containerStyle || {
          marginTop: type === "select" ? "0" : "8px",
        }
      }
    >
      {showLabel && (
        <label
          style={{
            color: "#fff",
            marginBottom: "4px",
            fontSize: ".8em",
            marginLeft: "8px",
          }}
          htmlFor={label}
        >
          {label}
        </label>
      )}
      {getInputTypes()}
    </div>
  );
};

Input.propTypes = {
  type: PropTypes.oneOf([
    "text",
    "number",
    "textarea",
    "select",
    "date",
    "datetime-local",
    "radio",
    "checkbox",
    "password",
  ]),
  containerStyle: PropTypes.object,
  style: PropTypes.object,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.bool,
  ]),
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.string,
    })
  ),
  name: PropTypes.string,
  showLabel: PropTypes.bool,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
};

export default Input;

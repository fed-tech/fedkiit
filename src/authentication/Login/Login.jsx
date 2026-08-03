"use client";

/* eslint-disable react/no-unescaped-entities */
/* eslint-disable no-unused-vars */
import React, { useState, useContext, useEffect } from "react";

import style from "./styles/Login.module.scss";
import Input from "../../components/Core/Input";
import Button from "../../components/Core/Button";
import Text from "../../components/Core/Text";
import users from "../../data/user.json";
import { api } from "../../services";
import AuthContext from "../../context/AuthContext";
import { RecoveryContext } from "../../context/RecoveryContext";
import GoogleLogin from "./GoogleLogin";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Alert, MicroLoading } from "../../microInteraction";
import Link from "next/link";
import { useRouter } from "next/navigation";
import postAuthRedirect from "../../utils/postAuthRedirect";

const Login = () => {
  const router = useRouter();
  const { setEmail } = useContext(RecoveryContext);
  const authCtx = useContext(AuthContext);
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const [navigatePath, setNavigatePath] = useState("/");
  const [email, setemail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (alert) {
      const { type, message, position, duration } = alert;
      Alert({ type, message, position, duration });
    }
  }, [alert]);

  // `replace`, not `push`: App.jsx redirected with <Navigate replace />, so the
  // login page must not sit in the history stack behind the destination.
  useEffect(() => {
    if (shouldNavigate) {
      router.replace(navigatePath);
      setShouldNavigate(false);
    }
  }, [shouldNavigate, navigatePath, router]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    if (email === "" || password === "") {
      setAlert({
        type: "error",
        message: "Please fill all the fields",
        position: "bottom-right",
        duration: 3000,
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post("/api/auth/login", {
        email: email.toLowerCase(),
        password,
      });

      // console.log("incoming response", response.data);

      if (response.status === 200 || response.status === 201) {
        const user = response.data.user;
        // console.log("user is ", user);

        setAlert({
          type: "success",
          message: "Login successful",
          position: "bottom-right",
          duration: 2800,
        });

        setNavigatePath(postAuthRedirect());

        setTimeout(() => {
          localStorage.setItem("token", response.data.token);
          authCtx.login(
            user.name,
            user.email,
            user.img,
            user.rollNumber,
            user.school,
            user.college,
            user.contactNo,
            user.year,
            user.extra?.github,
            user.extra?.linkedin,
            user.extra?.designation,
            user.access,
            user.editProfileCount,
            user.regForm,
            user.blurhash,
            response.data.token,
            9600000
          );
          // App.jsx re-rendered /Login as <LoginRedirect /> the moment
          // isLoggedIn flipped. App Router routes are files and nothing watches
          // that flag, so the navigation this component was already wired for
          // has to be triggered explicitly.
          setShouldNavigate(true);
        }, 800);
        // console.log(authCtx);

      } else {
        setAlert({
          type: "error",
          message: response.data.message || "Invalid email or password",
          position: "bottom-right",
          duration: 3000,
        });
      }
    } catch (error) {
      setAlert({
        type: "error",
        message:
          error?.response?.data?.message ||
          "There was an error logging in. Please try again.",
        position: "bottom-right",
        duration: 3000,
      });
      console.error("Error logging in:", error?.response?.data?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = () => {
    setEmail(email);
    router.push("/ForgotPassword");
  };

  return (
    <div>
      <div className={style.container}>
        <Link href={"/"}>
          <div className={style.ArrowBackIcon}>
            <ArrowBackIcon />
          </div>
        </Link>
        <div className={style.circle}>
          <div></div>
        </div>
        <div className={style.circle1}></div>
        <div className={style.login}>
          <h1
            style={{
              paddingTop: "10px",
              background: "var(--primary)",
              width: "20%",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Login
          </h1>
          <GoogleLogin />
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div className={style.divider} />
            <p
              style={{
                color: "#fff",
                textAlign: "center",
                marginBottom: "0.2rem",
              }}
            >
              or
            </p>
            <div className={style.divider} />
          </div>
          <form className={style.form} onSubmit={handleLogin}>
            <Input
              type="text"
              placeholder="eg:something@gmail.com"
              label="Email"
              name="email"
              value={email}
              onChange={(e) => setemail(e.target.value)}
              required
              style={{
                width: "98%",
              }}
            />
            <Input
              type="password"
              placeholder="Enter your password"
              label="Password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "98%",
              }}
            />
            <Text
              onClick={handleForgot}
              variant="secondary"
              style={{
                fontSize: "0.7rem",
                cursor: "pointer",
                width: "40%",
                marginLeft: "0.4rem",
                background: "var(--primary)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Forget Password?
            </Text>
            <Button
              type="submit"
              style={{
                width: "98%",
                background: "var(--primary)",
                color: "#fff",
                height: "40px",
                marginTop: "20px",
                fontSize: "1rem",
                cursor: "pointer",
                marginLeft: "0.4rem",
              }}
              disabled={isLoading}
            >
              {isLoading ? <MicroLoading /> : "Login"}
            </Button>
            <Text
              style={{
                fontSize: "0.8rem",
                textAlign: "center",
                marginTop: "14px",
              }}
            >
              Don't have an account?{" "}
              <Link
                href="/signup"
                onClick={(e) => {
                  sessionStorage.setItem("prevPage", window.location.pathname);
                }}
                style={{
                  background: "var(--primary)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                Sign Up
              </Link>
            </Text>
          </form>
        </div>
      </div>
      <Alert />
    </div>
  );
};

export default Login;

"use server";
import { redirect } from "next/navigation";
export async function subscribeAction() { redirect("/tr/games"); }
export async function cancelAction() { redirect("/tr/me"); }

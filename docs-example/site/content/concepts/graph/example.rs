// A fixture for the walkthrough on this page: not compiled, only quoted.
let (x, y) = writer.build(|| {
    let half = constant(Real, 0.5);
    let x = quantity("x", Real);
    let y = x * half;
    (x, y)
})?;
